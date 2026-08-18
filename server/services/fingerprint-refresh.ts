import { storage } from "../storage";
import { onboardingService } from "./onboarding-service";

/**
 * Keeps the stored cinematic fingerprint fresh as users rate films in the
 * main app (film_feedback like/dislike), without a full onboarding recompute.
 *
 * Design:
 * - The onboarding-computed tagWeights are preserved once as `baseTagWeights`
 *   inside the fingerprint the first time we refresh.
 * - Every refresh recomputes tagWeights = baseTagWeights + deltas derived from
 *   ALL of the user's film feedback rows. This is idempotent (re-running never
 *   compounds weights) and cheap: one query + a small in-memory loop.
 * - Derived fields (topTags, nickname, vibeTraits, vibeProfile) are then
 *   recomputed from the merged weights using the same formulas the client
 *   uses in client/src/lib/fingerprint.ts.
 */

// Mirror of CINEMATCH_TAG_MAP in client/src/lib/films.ts — keep in sync.
const TAG_MAP: Record<string, { cat: "tone" | "style" | "pace" | "flavour"; label: string }> = {
  whimsical: { cat: "tone", label: "whimsical" },
  symmetrical: { cat: "style", label: "symmetrical" },
  witty: { cat: "tone", label: "witty" },
  pastel: { cat: "style", label: "soft palette" },
  stylised: { cat: "style", label: "highly stylised" },
  bittersweet: { cat: "tone", label: "bittersweet" },
  intimate: { cat: "tone", label: "intimate" },
  poetic: { cat: "style", label: "poetic" },
  melancholic: { cat: "tone", label: "melancholic" },
  slow: { cat: "pace", label: "slow burn" },
  chaotic: { cat: "pace", label: "chaotic energy" },
  weird: { cat: "tone", label: "delightfully weird" },
  emotional: { cat: "tone", label: "emotionally heavy" },
  wild: { cat: "pace", label: "wild ride" },
  "genre-blending": { cat: "style", label: "genre-blending" },
  quiet: { cat: "pace", label: "quiet" },
  romantic: { cat: "tone", label: "romantic" },
  tense: { cat: "tone", label: "tense" },
  sharp: { cat: "tone", label: "sharp" },
  dark: { cat: "tone", label: "dark" },
  clever: { cat: "tone", label: "clever" },
  funny: { cat: "tone", label: "funny" },
  fast: { cat: "pace", label: "fast-paced" },
  silly: { cat: "tone", label: "silly" },
  british: { cat: "flavour", label: "very british" },
  honest: { cat: "tone", label: "painfully honest" },
  architectural: { cat: "style", label: "architectural eye" },
  cool: { cat: "tone", label: "cool" },
  moody: { cat: "tone", label: "moody" },
  neon: { cat: "style", label: "neon-drenched" },
  warm: { cat: "tone", label: "warm-hearted" },
  cosy: { cat: "tone", label: "cosy" },
};

// Maps film genres (from recommendationContext) to fingerprint tags.
const GENRE_TAG_MAP: Record<string, string[]> = {
  romance: ["romantic", "warm"],
  comedy: ["funny", "witty"],
  drama: ["emotional", "honest"],
  thriller: ["tense", "sharp"],
  horror: ["dark", "tense"],
  "science fiction": ["weird", "clever"],
  "sci-fi": ["weird", "clever"],
  animation: ["whimsical", "warm"],
  documentary: ["honest", "quiet"],
  action: ["fast", "wild"],
  adventure: ["wild", "fast"],
  mystery: ["clever", "moody"],
  fantasy: ["whimsical", "weird"],
  crime: ["dark", "sharp"],
  family: ["warm", "cosy"],
  music: ["emotional"],
  musical: ["emotional", "whimsical"],
  war: ["emotional", "dark"],
  history: ["quiet", "honest"],
  western: ["moody", "slow"],
};

// Same vibe grouping the client uses when computing vibeProfile.
const VIBE_TAG_MAP: Record<string, string[]> = {
  cosy: ["warm", "cosy", "whimsical"],
  thinky: ["clever", "melancholic", "weird", "dark"],
  funny: ["funny", "british"],
  tense: ["tense", "dark"],
  romantic: ["romantic", "emotional", "warm"],
};

const LIKE_WEIGHT = 0.4;   // matches onboarding scale (a 5★ rating adds 1.0 per tag; a like is softer)
const DISLIKE_WEIGHT = -0.2;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Extract fingerprint tags for a single feedback row. */
function tagsForFeedback(fb: { moodContext?: string | null; recommendationContext?: unknown }): string[] {
  const tags = new Set<string>();

  const ctx = fb.recommendationContext as { genres?: unknown; mood?: unknown } | null | undefined;
  if (ctx && Array.isArray(ctx.genres)) {
    for (const g of ctx.genres) {
      if (typeof g !== "string") continue;
      for (const t of GENRE_TAG_MAP[g.toLowerCase()] || []) tags.add(t);
    }
  }

  // Mood strings ("cosy, slow burn ...") often literally contain tag words.
  const moodSources = [fb.moodContext, ctx && typeof ctx.mood === "string" ? ctx.mood : null];
  for (const mood of moodSources) {
    if (typeof mood !== "string" || !mood) continue;
    const lower = mood.toLowerCase();
    for (const tag of Object.keys(TAG_MAP)) {
      if (lower.includes(tag)) tags.add(tag);
    }
  }

  return Array.from(tags);
}

/**
 * Recalculate and persist the user's fingerprint from base onboarding weights
 * plus all accumulated main-app film feedback. Safe to call after every
 * rating; errors are the caller's choice to swallow (recommendation flows
 * should never fail because of a fingerprint refresh).
 */
export async function refreshFingerprintFromFeedback(userId: number): Promise<void> {
  const user = await storage.getUser(userId);
  const state = user?.onboardingState as
    | { completed?: boolean; fingerprint?: Record<string, any> }
    | null
    | undefined;
  const fingerprint = state?.fingerprint;

  // Only refresh once onboarding has produced a fingerprint to build on.
  if (!state?.completed || !fingerprint || typeof fingerprint !== "object") return;

  const base: Record<string, number> =
    (fingerprint.baseTagWeights as Record<string, number>) ||
    (fingerprint.tagWeights as Record<string, number>) ||
    {};

  const allFeedback = await storage.getAllFilmFeedback(userId);
  if (!allFeedback.length) return;

  // Merge: base onboarding weights + feedback deltas (floored at 0).
  const tagWeights: Record<string, number> = { ...base };
  for (const fb of allFeedback) {
    const delta = fb.liked ? LIKE_WEIGHT : DISLIKE_WEIGHT;
    for (const tag of tagsForFeedback(fb)) {
      tagWeights[tag] = Math.max(0, (tagWeights[tag] || 0) + delta);
    }
  }

  // Derived fields — same formulas as client/src/lib/fingerprint.ts.
  const sorted = Object.entries(tagWeights).sort((a, b) => b[1] - a[1]);
  const topTags = sorted.slice(0, 5).map(([t]) => t);
  const labels = topTags.map(t => TAG_MAP[t]?.label || t);

  const nickname =
    labels.length >= 2
      ? `${capitalize(labels[0])} + ${capitalize(labels[1])}`
      : capitalize(labels[0] || fingerprint.nickname || "Cinephile");

  const paceTag = topTags.find(t => TAG_MAP[t]?.cat === "pace") || "slow";
  const styleTag = topTags.find(t => TAG_MAP[t]?.cat === "style") || "stylised";
  const toneTag = topTags.find(t => TAG_MAP[t]?.cat === "tone") || "bittersweet";

  const vibeProfile: Record<string, number> = {};
  for (const [vibe, tags] of Object.entries(VIBE_TAG_MAP)) {
    vibeProfile[vibe] = tags.reduce((sum, t) => sum + (tagWeights[t] || 0), 0);
  }

  await onboardingService.updateOnboardingState(userId, {
    fingerprint: {
      ...fingerprint,
      baseTagWeights: base, // preserved so refreshes never compound
      tagWeights,
      topTags,
      nickname,
      vibeTraits: {
        tone: TAG_MAP[toneTag]?.label || toneTag,
        style: TAG_MAP[styleTag]?.label || styleTag,
        pace: TAG_MAP[paceTag]?.label || paceTag,
      },
      vibeProfile,
      feedbackCount: allFeedback.length,
      fingerprintRefreshedAt: new Date().toISOString(),
    },
  });

  console.log(`Fingerprint refreshed for user ${userId} from ${allFeedback.length} feedback entries`);
}
