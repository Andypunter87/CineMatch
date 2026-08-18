// Maps slot-machine reel selections to the AI recommender
// (POST /api/recommendations) and adapts the returned films to the
// CatalogueFilm shape the deck renders.

import { FEEL_MAP, FLAVOUR_MAP, type CatalogueFilm } from './cinema-catalogue';

type ReelData = { opts: string[]; i: number };

export interface AiFilm {
  id: number;
  title: string;
  year: number;
  director: string;
  synopsis?: string;
  genres?: string[];
  posterUrl?: string;
  matchPercentage?: number;
  matchReason?: string;
  availableOn?: string[];
  runtime?: number; // minutes
  voteAverage?: number;
}

const ERA_PHRASES: Record<string, string> = {
  'today':   'released in the 2020s',
  "'10s":    'released in the 2010s',
  "'00s":    'released in the 2000s',
  "'90s":    'released in the 1990s',
  "'80s":    'released in the 1980s',
  'classic': 'a classic released before 1980',
};

async function getViewingParty(): Promise<number[]> {
  // Collect the other session members' user ids so the server blends
  // the whole group's taste, not just the current user's.
  try {
    const session = JSON.parse(localStorage.getItem('cinematch_session') || 'null');
    const code = session?.sessionCode;
    if (!code) return [];
    const res = await fetch(`/api/sessions/${code}`);
    if (!res.ok) return [];
    const data = await res.json();
    const members: Array<{ id?: number; userId?: number | null }> = data?.members || [];
    return members
      .filter(m => m.userId != null && m.id !== session?.memberId)
      .map(m => m.userId as number);
  } catch {
    return [];
  }
}

export function reelsToRequest(reels: ReelData[], isGroup: boolean, viewingParty: number[] = []) {
  const feel    = reels[0]?.opts[reels[0].i] ?? 'cosy';
  const flavour = reels[1]?.opts[reels[1].i] ?? '';
  const length  = reels[2]?.opts[reels[2].i] ?? '~2 hrs';
  const era     = reels[3]?.opts[reels[3].i] ?? '';

  const moodParts = [feel];
  if (flavour) moodParts.push(flavour);
  const eraPhrase = ERA_PHRASES[era];
  const mood = `${moodParts.join(', ')}${eraPhrase ? ` — strongly prefer films ${eraPhrase}` : ''}`;

  const runtime =
    length === 'under 90m' ? (['short'] as const) :
    length === '~2 hrs'    ? (['medium'] as const) :
    undefined; // 'epic ok' — no runtime constraint

  return {
    location: 'home',
    audience: isGroup ? 'friends' : 'solo',
    timeOfDay: ['weekend'],
    mood,
    ...(runtime ? { runtime: [...runtime] } : {}),
    ...(isGroup && viewingParty.length ? { viewingParty } : {}),
    // Ask for more than we show — the server's runtime/streaming filters
    // can trim the batch, and the deck wants up to 5 films.
    requestedBatchSize: 8,
  };
}

const PALETTES: Array<{ colors: [string, string, string]; stripe: CatalogueFilm['stripe'] }> = [
  { colors: ['#E8A4C4', '#F0C8A8', '#C8A0B4'], stripe: 'horizontal' },
  { colors: ['#1A3A5C', '#4A6B8C', '#2C4C6D'], stripe: 'diagonal' },
  { colors: ['#FF6B9D', '#FFB84D', '#4DBFB8'], stripe: 'burst' },
  { colors: ['#4A6B2F', '#C4A876', '#7B8FA6'], stripe: 'vertical' },
  { colors: ['#D64545', '#F0A030', '#3A3A3A'], stripe: 'flame' },
  { colors: ['#8B1E3F', '#D4A574', '#3A2416'], stripe: 'splash' },
];

function deriveWhy(feel: string, flavour: string, match: number, seed: number): CatalogueFilm['why'] {
  const feelW = FEEL_MAP[feel] || {};
  const flavW = FLAVOUR_MAP[flavour] || {};
  const keys = ['cosy', 'thinky', 'funny', 'tense', 'romantic'] as const;
  const out = {} as CatalogueFilm['why'];
  keys.forEach((k, ki) => {
    const base = ((feelW[k] || 0) * 22) + ((flavW[k] || 0) * 14);
    const jitter = ((seed + ki * 3) % 11) - 5;
    const scaled = Math.round((base || 12) * (match ? match / 100 : 0.8)) + jitter;
    out[k] = Math.max(5, Math.min(98, scaled));
  });
  return out;
}

function tmdbPosterPath(posterUrl?: string): string | undefined {
  if (!posterUrl) return undefined;
  const m = posterUrl.match(/image\.tmdb\.org\/t\/p\/[^/]+(\/.+)$/);
  return m ? m[1] : undefined;
}

export function adaptAiFilms(films: AiFilm[], reels: ReelData[]): CatalogueFilm[] {
  const feel    = reels[0]?.opts[reels[0].i] ?? 'cosy';
  const flavour = reels[1]?.opts[reels[1].i] ?? '';
  return films.map((f, idx) => {
    const palette = PALETTES[(f.id + idx) % PALETTES.length];
    return {
      id: f.id,
      title: f.title,
      year: f.year,
      director: f.director,
      tags: (f.genres || []).slice(0, 4).map(g => g.toLowerCase()),
      blurb: f.synopsis || '',
      why: deriveWhy(feel, flavour, f.matchPercentage || 80, f.id),
      streaming: f.availableOn?.[0] || 'Search',
      runtime: f.runtime ? `${f.runtime} min` : '—',
      rating: f.voteAverage ? `★ ${f.voteAverage.toFixed(1)}` : '—',
      colors: palette.colors,
      stripe: palette.stripe,
      posterPath: tmdbPosterPath(f.posterUrl),
      whyText: f.matchReason,
    };
  });
}

async function requestSpinnerFilms(reels: ReelData[], isGroup: boolean): Promise<CatalogueFilm[]> {
  const viewingParty = isGroup ? await getViewingParty() : [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reelsToRequest(reels, isGroup, viewingParty)),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`recommendations failed: ${res.status}`);
    const data = await res.json();
    const films: AiFilm[] = Array.isArray(data) ? data : (data?.films || data?.recommendations || []);
    if (!films.length) throw new Error('no films returned');
    return adaptAiFilms(films.slice(0, 5), reels);
  } finally {
    clearTimeout(timeout);
  }
}

// Module-level in-flight cache: keeps a single request alive across
// React Strict Mode's mount → unmount → remount rehearsal, so the spin
// triggers exactly one AI call and the remounted effect reuses it.
let inflight: { key: string; promise: Promise<CatalogueFilm[]> } | null = null;

export function fetchSpinnerFilms(reels: ReelData[], isGroup: boolean): Promise<CatalogueFilm[]> {
  const key = JSON.stringify({ reels: reels.map(r => r.i), isGroup, t: localStorage.getItem('cinematch_reels') });
  if (inflight && inflight.key === key) return inflight.promise;
  const promise = requestSpinnerFilms(reels, isGroup).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { key, promise };
  return promise;
}
