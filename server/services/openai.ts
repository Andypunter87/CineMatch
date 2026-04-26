import Anthropic from "@anthropic-ai/sdk";
import { RecommendationRequest, Film } from "@shared/schema";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-opus-4-5";

interface AIRecommendationResponse {
  recommendations: Film[];
}

const CACHE_TTL = 60 * 60 * 1000;
const recommendationCache = new Map<string, {timestamp: number, data: Film[]}>();

export async function getAIRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  const TIMEOUT_MS = 20000;
  const MAX_RETRIES = 2;

  const { excludeFilmIds, viewingParty, userRatedFilms, requestedBatchSize, ...cacheablePreferences } = preferences;

  const standardBatchSize = 6;

  const cacheKey = JSON.stringify({
    location: cacheablePreferences.location,
    audience: cacheablePreferences.audience,
    mood: cacheablePreferences.mood,
    timeOfDay: cacheablePreferences.timeOfDay,
    runtime: cacheablePreferences.runtime,
    country: cacheablePreferences.country,
    batchSize: standardBatchSize,
    streamingServices: cacheablePreferences.streamingServices?.sort() || [],
    hasViewingParty: !!viewingParty,
    friendCount: viewingParty?.length || 0,
    hasUserRatings: !!userRatedFilms?.length,
    userRatingsCount: userRatedFilms?.length || 0,
    fingerprintTopTags: cacheablePreferences.fingerprintProfile?.topTags?.slice().sort() || [],
    // Include top weighted tags (sorted by name for stability) so users with same topTags
    // but different weight distributions are not served the same cached result
    fingerprintWeightedTags: cacheablePreferences.fingerprintProfile?.tagWeights
      ? Object.entries(cacheablePreferences.fingerprintProfile.tagWeights)
          .filter(([, w]) => typeof w === 'number' && w > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([tag, w]) => `${tag}:${w.toFixed(1)}`)
      : [],
    fingerprintGenres: cacheablePreferences.fingerprintProfile?.genres?.slice().sort() || [],
    fingerprintVibeTraits: cacheablePreferences.fingerprintProfile?.vibeTraits
      ? `${cacheablePreferences.fingerprintProfile.vibeTraits.tone}|${cacheablePreferences.fingerprintProfile.vibeTraits.style}|${cacheablePreferences.fingerprintProfile.vibeTraits.pace}`
      : '',
    fingerprintVibeProfile: cacheablePreferences.fingerprintProfile?.vibeProfile
      ? Object.entries(cacheablePreferences.fingerprintProfile.vibeProfile)
          .filter(([, v]) => typeof v === 'number' && isFinite(v) && v > 0)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, v]) => `${k}:${v.toFixed(1)}`)
          .join(',')
      : '',
  });

  const now = Date.now();
  const cachedResult = recommendationCache.get(cacheKey);

  if (cachedResult && (now - cachedResult.timestamp) < CACHE_TTL) {
    console.log('Using cached recommendation results');

    let filteredResults = cachedResult.data;
    if (excludeFilmIds?.length) {
      filteredResults = filteredResults.filter(film => !excludeFilmIds.includes(film.id));
      console.log(`Filtered ${cachedResult.data.length - filteredResults.length} excluded films from cache results`);
    }

    const actualBatchSize = requestedBatchSize || 6;
    if (filteredResults.length > actualBatchSize) {
      filteredResults = filteredResults.slice(0, actualBatchSize);
    }

    return filteredResults;
  }

  const createTimeoutPromise = () => new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Claude request timed out")), TIMEOUT_MS);
  });

  const timeOfDayString = preferences.timeOfDay.join(", ");

  const systemPrompt = `You are a film recommendation expert with deep knowledge of global cinema. 
Provide personalized movie recommendations based on the user's preferences.

IMPORTANT ABOUT STREAMING AVAILABILITY:
1. If NO streaming services are specified by the user, leave the 'availableOn' array EMPTY for ALL recommendations
2. If streaming services ARE specified, ONLY include them in 'availableOn' when there's a STRONG likelihood the film is available on that service
3. For older or obscure films, it's better to leave 'availableOn' as an empty array than to make uncertain guesses
4. NEVER include streaming services the user didn't specify in their preferences

IMPORTANT ABOUT EXCLUDED FILMS:
1. If the user provides a list of film IDs to exclude, NEVER include any film with those IDs in your recommendations
2. Films with excluded IDs should be completely omitted from your response - do not reference them at all
3. Exclusions take absolute priority over all other matching criteria

IMPORTANT ABOUT USER RATINGS:
1. If the user provides a list of rated films, use these ratings to personalize recommendations
2. For highly rated films (4-5 stars), recommend similar films with related genres, directors, or styles
3. For moderately rated films (3 stars), consider their genres but don't prioritize them
4. For poorly rated films (1-2 stars), avoid recommending similar films
5. Pay special attention to the genres and film types (mainstream vs indie) that the user has rated highly
6. If the user has rated both indie and mainstream films, ensure a balanced mix in recommendations

IMPORTANT ABOUT CINEMATIC FINGERPRINT:
1. If the user provides a cinematic fingerprint (taste profile from an onboarding taste-test), treat it as a strong personalisation signal
2. The fingerprint's top tags describe the film styles and genres the user gravitates towards — weight your recommendations heavily toward these
3. The fingerprint genres represent the user's preferred genre categories — prioritise films within these genres
4. The fingerprint vibe traits (tone, style, pace) describe the user's cinematic personality — match recommendations to this aesthetic
5. The fingerprint vibe profile shows relative affinities (e.g. cosy, thinky, funny, tense, romantic) — balance recommendations to reflect these
6. When both a fingerprint AND rated films are present, use rated films as the primary signal and the fingerprint as a secondary refinement
7. When only a fingerprint is present (new user with no rated films), rely on it as the primary personalisation source

IMPORTANT ABOUT AUDIENCES:
1. If audience is "solo", focus purely on the user's personal taste based on other preferences
2. If audience is "friends", prioritize films that work well with groups (comedies, action films, or broadly appealing entertainment)
3. If audience is "date", prioritize films that work well for couples (romantic comedies, dramas with romantic elements, or crowd-pleasing films that set the right tone)
4. If audience is "family", prioritize family-friendly films appropriate for all ages (avoiding excessive violence, sexual content, or strong language)

IMPORTANT ABOUT GROUP VIEWING:
1. If the user indicates this is a group viewing with friends, prioritize films that:
   a. Are broadly appealing rather than niche or divisive
   b. Spark conversation or create shared experiences
   c. Have strong entertainment value over artistic merit in borderline cases
   d. Balance the preferences of everyone in the group based on their rated films
   e. Find common ground in genres and styles that overlap across multiple friends' preferences
2. For date night, prioritize films that create a shared emotional experience and can lead to interesting conversation
3. For family viewing, prioritize films with positive themes, clear storylines, and appropriate content

Return the requested number of films that match the criteria:
- PRIORITIZE films most likely to be available on streaming services (including specialty platforms like Mubi, Criterion Channel, etc.)
- Focus on films that have had digital releases and wide distribution
- Include both popular and independent films that are commonly available on streaming platforms
- ALL films should strongly match the user's mood, audience and setting preferences
- Include films with complete information (especially those that have runtime data available)
- When user has rated films, prioritize recommendations that match their apparent taste

Respond with a JSON object with a 'recommendations' array and nothing else.`;

  const userQuery = `I'm looking for movie recommendations with these preferences:
- Setting: ${preferences.location}
- Audience: ${preferences.audience || "solo"} 
- Time: ${timeOfDayString}
- Mood: ${preferences.mood}
- Number of films to return: ${preferences.requestedBatchSize || 6}
${preferences.runtime && preferences.runtime.length > 0
  ? `- Runtime preferences: ${preferences.runtime.map(r => 
    r === "short" ? "Under 90 minutes" : 
    r === "medium" ? "90-120 minutes" : 
    "Over 120 minutes").join(", ")}`
  : `- No runtime preference specified`
}
${preferences.streamingServices && preferences.streamingServices.length > 0 
  ? `- User has access to these streaming services: ${preferences.streamingServices.join(", ")}`
  : `- User hasn't specified any streaming services`
}
${preferences.country 
  ? `- User is located in: ${preferences.country}`
  : `- User location: Unknown`
}
${preferences.viewingParty && preferences.viewingParty.length > 0
  ? `- IMPORTANT: This is a ${preferences.audience === "date" ? "date night" : "group viewing"} with ${preferences.viewingParty.length} other ${preferences.viewingParty.length === 1 ? "person" : "people"}. 
  - For this group viewing, make sure the recommendations:
    * Are broadly appealing rather than niche
    * Find common ground in the film preferences of everyone in the group
    * Balance entertainment value with the group's taste preferences
    * Consider that the ratings above include EVERYONE'S preferences combined`
  : ""
}
${preferences.audience === "family"
  ? "- IMPORTANT: These are family-friendly recommendations. Prioritize films appropriate for family viewing with content suitable for all ages."
  : ""
}
${preferences.excludeFilmIds && preferences.excludeFilmIds.length > 0
  ? `- IMPORTANT: User has already seen these films, EXCLUDE them completely from recommendations: Films with IDs ${preferences.excludeFilmIds.join(", ")}`
  : ""
}
${preferences.userRatedFilms && preferences.userRatedFilms.length > 0
  ? `- IMPORTANT: User has rated these films, use them to personalize recommendations:
${preferences.userRatedFilms.map(film => 
  `  * "${film.title}" (${film.filmType}) - Genres: [${film.genres.join(", ")}] - User rating: ${film.rating}/5`
).join("\n")}`
  : ""
}
${preferences.fingerprintProfile && (preferences.fingerprintProfile.topTags?.length || preferences.fingerprintProfile.genres?.length || preferences.fingerprintProfile.tagWeights)
  ? (() => {
      const fp = preferences.fingerprintProfile!;
      // Build a ranked list of taste tags with their weights so Claude can gauge relative importance
      const weightedTags = fp.tagWeights
        ? Object.entries(fp.tagWeights)
            .filter(([, w]) => typeof w === 'number' && isFinite(w) && w > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([tag, w]) => `${tag} (${w.toFixed(2)})`)
        : [];
      const topVibes = fp.vibeProfile
        ? Object.entries(fp.vibeProfile)
            .filter(([, v]) => typeof v === 'number' && isFinite(v) && v > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([k, v]) => `${k} (${v.toFixed(1)})`)
        : [];
      return `- IMPORTANT: User has a cinematic fingerprint from their taste-test. Use this to personalise recommendations:
${fp.nickname ? `  * Taste profile nickname: "${fp.nickname}"` : ""}
${fp.genres?.length ? `  * Preferred genres: [${fp.genres.join(", ")}]` : ""}
${fp.vibeTraits ? `  * Cinematic personality — Tone: ${fp.vibeTraits.tone}, Style: ${fp.vibeTraits.style}, Pace: ${fp.vibeTraits.pace}` : ""}
${topVibes.length ? `  * Vibe affinities (highest first): ${topVibes.join(", ")}` : ""}
${fp.topTags?.length ? `  * Top taste tags (ordered by strength): [${fp.topTags.slice(0, 6).join(", ")}]` : ""}
${weightedTags.length ? `  * Weighted taste signals (tag name with score — higher score = stronger preference): ${weightedTags.join(", ")}` : ""}
  * ${preferences.userRatedFilms?.length ? "Use the fingerprint as a secondary signal alongside the rated films above." : "The user is new with no rating history — rely on this fingerprint as the primary personalisation source."}`;
    })()
  : ""
}

Each recommendation must include:
- id (number)
- title (string)
- year (number, between 1920-2023)
- director (string)
- actors (array of strings, 3-4 names maximum)
- synopsis (string, 1-2 sentences only)
- genres (array of strings, 2-3 genres maximum)
- type ("mainstream" or "indie" only)
- matchPercentage (number between 80-98)
- matchReason (string, 10-15 words)
- availableOn (array of strings)

IMPORTANT ABOUT AVAILABILITY:
- If the user hasn't specified any streaming services, the availableOn array should be EMPTY for all films
- If the user has specified streaming services, ONLY include services in availableOn when they likely have that specific film
- For older or obscure films, it's usually better to leave availableOn as an empty array
- NEVER include streaming services that aren't in the user's list

DO NOT include a posterUrl field in your response.`;

  const makeClaudeCall = async (retryCount = 0): Promise<Film[]> => {
    try {
      console.log(`Making Claude request (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      const responsePromise = anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: "user", content: userQuery }
        ]
      });

      const response = await Promise.race([responsePromise, createTimeoutPromise()]) as any;

      let parsedContent: AIRecommendationResponse;
      try {
        const block = response.content[0];
        if (!block || block.type !== "text" || !block.text) {
          throw new Error("Empty response from Claude");
        }

        let text = block.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }

        parsedContent = JSON.parse(text) as AIRecommendationResponse;

        if (!parsedContent.recommendations || !Array.isArray(parsedContent.recommendations) || parsedContent.recommendations.length === 0) {
          throw new Error("Invalid recommendations structure in Claude response");
        }

        console.log(`Successfully received AI recommendations (attempt ${retryCount + 1})`);
      } catch (parseError) {
        console.error(`Error parsing Claude response (attempt ${retryCount + 1}):`, parseError);

        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying Claude request after parsing error...`);
          return makeClaudeCall(retryCount + 1);
        }
        throw new Error("Failed to parse AI recommendations after multiple attempts");
      }

      return parsedContent.recommendations.map(film => {
        const backgrounds = [
          "linear-gradient(135deg, #3498db, #2c3e50)",
          "linear-gradient(135deg, #e74c3c, #c0392b)",
          "linear-gradient(135deg, #1abc9c, #16a085)",
          "linear-gradient(135deg, #9b59b6, #8e44ad)",
          "linear-gradient(135deg, #f1c40f, #f39c12)"
        ];

        const firstChar = (film.title || "A").charAt(0).toLowerCase();
        const backgroundIndex = firstChar.charCodeAt(0) % backgrounds.length;

        return {
          id: film.id || Math.floor(Math.random() * 10000),
          title: film.title,
          year: typeof film.year === 'number' ? film.year : 2000,
          director: film.director || "Unknown",
          actors: Array.isArray(film.actors) ? film.actors.slice(0, 4) : ["Unknown"],
          synopsis: film.synopsis || "No synopsis available",
          genres: Array.isArray(film.genres) ? film.genres.slice(0, 3) : ["Drama"],
          type: (film.type === "mainstream" || film.type === "indie") ? film.type : "mainstream",
          posterUrl: "",
          matchPercentage: typeof film.matchPercentage === 'number' ? film.matchPercentage : 85,
          matchReason: film.matchReason || `Great match for ${preferences.mood} mood`,
          availableOn: Array.isArray(film.availableOn) ? film.availableOn : []
        };
      });
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Retrying Claude request after error: ${errorMessage}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return makeClaudeCall(retryCount + 1);
      }

      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error getting AI recommendations after ${retryCount + 1} attempts: ${errorDetails}`);
      throw new Error("Failed to get AI recommendations after multiple attempts");
    }
  };

  try {
    const recommendations = await makeClaudeCall();

    recommendationCache.set(cacheKey, {
      timestamp: Date.now(),
      data: recommendations
    });

    Array.from(recommendationCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_TTL) {
        recommendationCache.delete(key);
      }
    });

    return recommendations;
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    console.error(`All Claude request attempts failed: ${errorDetails}`);
    throw new Error("Failed to get AI recommendations");
  }
}
