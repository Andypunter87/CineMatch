// ── Daylight (v3) design tokens ────────────────────────────────
export const C = {
  paper: '#FBF4F0',
  paper2: '#FFFCFA',
  ink: '#241F1D',
  inkSoft: '#6B625C',
  inkLight: '#9A9089',
  onAccent: '#241F1D',
  pink: '#F2A488',
  yellow: '#F6C85A',
  blue: '#8FC7D4',
  mint: '#A8D8C4',
  lilac: '#C7B6EC',
  coral: '#F0B27A',
  // hairline borders
  edge: 'rgba(36,31,29,.13)',
  edgeCard: 'rgba(36,31,29,.10)',
  edgeStrong: 'rgba(36,31,29,.18)',
  edgeDash: 'rgba(36,31,29,.2)',
  // links
  link: '#C2603F',
  // vibe-bar fills (deeper saturated values)
  barCosy: '#E8A72C',
  barFunny: '#E8734A',
  barThinky: '#3E93A8',
  barTense: '#C2603F',
  barTrack: 'rgba(36,31,29,.07)',
  barTrackEdge: 'rgba(36,31,29,.08)',
  // shadows (warm, soft)
  shadowChip: '0 5px 14px rgba(74,52,40,.09)',
  shadowBtn: '0 7px 20px rgba(74,52,40,.10)',
  shadowPanel: '0 10px 26px rgba(74,52,40,.11)',
  shadowCard: '0 16px 36px rgba(74,52,40,.13)',
  // page wash (soft tinted backdrop)
  wash: `radial-gradient(circle at 12% 12%, rgba(246,200,90,.28) 0%, transparent 46%),
    radial-gradient(circle at 88% 78%, rgba(168,216,196,.34) 0%, transparent 48%),
    radial-gradient(circle at 60% 40%, rgba(242,164,136,.16) 0%, transparent 55%)`,
};

export interface CatalogueFilm {
  id: number;
  title: string;
  year: number;
  director: string;
  tags: string[];
  blurb: string;
  why: { cosy: number; thinky: number; funny: number; tense: number; romantic: number };
  streaming: string;
  runtime: string;
  rating: string;
  colors: string[];
  stripe: string;
  posterPath?: string;
  whyText?: string; // AI-provided match reason (preferred over WHY_TEXT template)
}

export const CATALOGUE_FILMS: CatalogueFilm[] = [
  { id: 1, title: 'The Grand Budapest Hotel', year: 2014, director: 'Wes Anderson',
    tags: ['whimsical', 'witty', 'stylised', 'funny'],
    blurb: 'A concierge, a lobby boy, and a stolen painting.',
    why: { cosy: 90, thinky: 45, funny: 85, tense: 30, romantic: 40 },
    streaming: 'Disney+', runtime: '99 min', rating: 'PG-13',
    colors: ['#E8A4C4', '#F0C8A8', '#C8A0B4'], stripe: 'horizontal',
    posterPath: '/eWdyYQreja6JiT2UT4KMC3jkD96.jpg' },
  { id: 2, title: 'Moonlight', year: 2016, director: 'Barry Jenkins',
    tags: ['bittersweet', 'intimate', 'poetic', 'melancholic', 'slow'],
    blurb: 'Three chapters. One life. Luminous and tender.',
    why: { cosy: 30, thinky: 85, funny: 10, tense: 55, romantic: 65 },
    streaming: 'MUBI', runtime: '111 min', rating: 'R',
    colors: ['#1A3A5C', '#4A6B8C', '#2C4C6D'], stripe: 'diagonal',
    posterPath: '/4911T5FbJ9eAlnau0UX9cdNHfnC.jpg' },
  { id: 3, title: 'Everything Everywhere All at Once', year: 2022, director: 'Daniels',
    tags: ['chaotic', 'weird', 'emotional', 'wild', 'funny'],
    blurb: 'A laundromat owner saves every possible universe.',
    why: { cosy: 40, thinky: 75, funny: 80, tense: 60, romantic: 50 },
    streaming: 'Netflix', runtime: '139 min', rating: 'R',
    colors: ['#FF6B9D', '#FFB84D', '#4DBFB8'], stripe: 'burst',
    posterPath: '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg' },
  { id: 4, title: 'Past Lives', year: 2023, director: 'Celine Song',
    tags: ['bittersweet', 'quiet', 'romantic', 'melancholic', 'slow'],
    blurb: 'Two childhood friends, twenty years apart.',
    why: { cosy: 50, thinky: 70, funny: 15, tense: 25, romantic: 95 },
    streaming: 'MUBI', runtime: '106 min', rating: 'PG-13',
    colors: ['#2E3B4E', '#7B8FA6', '#C9B8A8'], stripe: 'vertical',
    posterPath: '/k3waqVXCHklkNRuOykuKAGKoYN3.jpg' },
  { id: 5, title: 'Parasite', year: 2019, director: 'Bong Joon-ho',
    tags: ['tense', 'sharp', 'dark', 'clever'],
    blurb: 'A poor family infiltrates a rich one. Things escalate.',
    why: { cosy: 15, thinky: 90, funny: 35, tense: 95, romantic: 20 },
    streaming: 'Prime', runtime: '132 min', rating: 'R',
    colors: ['#3A3A3A', '#C4A876', '#8B6F47'], stripe: 'horizontal',
    posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
  { id: 6, title: 'Hot Fuzz', year: 2007, director: 'Edgar Wright',
    tags: ['funny', 'fast', 'silly', 'clever'],
    blurb: 'Supercop. Village. Not what it seems.',
    why: { cosy: 55, thinky: 40, funny: 95, tense: 70, romantic: 20 },
    streaming: 'Netflix', runtime: '121 min', rating: 'R',
    colors: ['#D64545', '#4A6B2F', '#8B9467'], stripe: 'splash',
    posterPath: '/mwGa2I3zN9PndFR0QVQrGNGhKmP.jpg' },
  { id: 7, title: 'In the Mood for Love', year: 2000, director: 'Wong Kar-wai',
    tags: ['romantic', 'melancholic', 'stylised', 'slow', 'intimate'],
    blurb: 'Two neighbours. 1960s Hong Kong. A rehearsal.',
    why: { cosy: 60, thinky: 75, funny: 10, tense: 30, romantic: 98 },
    streaming: 'MUBI', runtime: '98 min', rating: 'PG',
    colors: ['#8B1E3F', '#D4A574', '#3A2416'], stripe: 'diagonal',
    posterPath: '/iFoNGfZGkDzO5BSLLY6z6o2F0Kx.jpg' },
  { id: 8, title: 'The Worst Person in the World', year: 2021, director: 'Joachim Trier',
    tags: ['bittersweet', 'funny', 'honest', 'romantic'],
    blurb: 'Julie. Oslo. Nearly thirty. Figuring it out.',
    why: { cosy: 60, thinky: 65, funny: 65, tense: 30, romantic: 75 },
    streaming: 'MUBI', runtime: '128 min', rating: 'R',
    colors: ['#E85D75', '#F4C2C2', '#A8455C'], stripe: 'horizontal',
    posterPath: '/4O5DouULvKGlHRuKqIFNMV4pREu.jpg' },
  { id: 9, title: 'Drive', year: 2011, director: 'Nicolas Winding Refn',
    tags: ['stylised', 'tense', 'cool', 'moody', 'neon'],
    blurb: 'Hollywood stuntman. Getaway driver. Consequences.',
    why: { cosy: 20, thinky: 55, funny: 10, tense: 90, romantic: 55 },
    streaming: 'Prime', runtime: '100 min', rating: 'R',
    colors: ['#E91E63', '#1A1A2E', '#16213E'], stripe: 'neon',
    posterPath: '/602vevIURmpzkMCFDNw3Cv8IQCY.jpg' },
  { id: 10, title: 'Paddington 2', year: 2017, director: 'Paul King',
    tags: ['whimsical', 'warm', 'funny', 'cosy'],
    blurb: "A bear, a pop-up book, Hugh Grant's career highlight.",
    why: { cosy: 98, thinky: 20, funny: 90, tense: 25, romantic: 30 },
    streaming: 'Netflix', runtime: '103 min', rating: 'PG',
    colors: ['#2A5D8F', '#E8B547', '#7FB3D3'], stripe: 'splash',
    posterPath: '/igvQKXXnFJsYVAqPq98j1YPHQFR.jpg' },
  { id: 11, title: 'Portrait of a Lady on Fire', year: 2019, director: 'Céline Sciamma',
    tags: ['romantic', 'poetic', 'slow', 'intimate', 'stylised'],
    blurb: 'A painter, her subject, an 18th-century summer.',
    why: { cosy: 55, thinky: 80, funny: 5, tense: 30, romantic: 97 },
    streaming: 'MUBI', runtime: '122 min', rating: 'NR',
    colors: ['#6B4226', '#E8C896', '#8B5A3C'], stripe: 'flame',
    posterPath: '/3xRn7e8TkDL1fU1hNzLhNIGRBg6.jpg' },
  { id: 13, title: 'Frances Ha', year: 2012, director: 'Noah Baumbach',
    tags: ['funny', 'bittersweet', 'scrappy', 'charming'],
    blurb: 'A dancer who doesn\'t really dance, figuring it out.',
    why: { cosy: 60, thinky: 45, funny: 75, tense: 10, romantic: 35 },
    streaming: 'MUBI', runtime: '86 min', rating: 'R',
    colors: ['#2B2B2B', '#D8D8D8', '#8C8C8C'], stripe: 'vertical' },
  { id: 14, title: 'Before Sunset', year: 2004, director: 'Richard Linklater',
    tags: ['romantic', 'talky', 'real-time', 'bittersweet'],
    blurb: 'Nine years later. One afternoon in Paris. Just talking.',
    why: { cosy: 45, thinky: 65, funny: 30, tense: 15, romantic: 95 },
    streaming: 'Prime', runtime: '80 min', rating: 'R',
    colors: ['#D9A66C', '#8C6B4F', '#EFD9B4'], stripe: 'horizontal' },
  { id: 15, title: 'Run Lola Run', year: 1998, director: 'Tom Tykwer',
    tags: ['fast', 'wild', 'kinetic', 'tense'],
    blurb: 'Twenty minutes. Three chances. Run.',
    why: { cosy: 5, thinky: 50, funny: 25, tense: 90, romantic: 35 },
    streaming: 'Prime', runtime: '80 min', rating: 'R',
    colors: ['#D64545', '#F0A030', '#3A3A3A'], stripe: 'flame' },
  { id: 16, title: 'Stand by Me', year: 1986, director: 'Rob Reiner',
    tags: ['nostalgic', 'bittersweet', 'warm', 'coming-of-age'],
    blurb: 'Four boys, one summer, a walk that changes everything.',
    why: { cosy: 75, thinky: 50, funny: 45, tense: 30, romantic: 15 },
    streaming: 'Netflix', runtime: '89 min', rating: 'R',
    colors: ['#4A6B2F', '#C4A876', '#7B8FA6'], stripe: 'horizontal' },
  { id: 17, title: 'Petite Maman', year: 2021, director: 'Céline Sciamma',
    tags: ['quiet', 'tender', 'magical', 'small'],
    blurb: 'A girl meets her mother — at eight years old.',
    why: { cosy: 80, thinky: 60, funny: 20, tense: 5, romantic: 30 },
    streaming: 'MUBI', runtime: '72 min', rating: 'PG',
    colors: ['#A8D8C4', '#EFD9B4', '#7B8FA6'], stripe: 'vertical' },
  { id: 18, title: 'The Princess Bride', year: 1987, director: 'Rob Reiner',
    tags: ['funny', 'romantic', 'adventure', 'quotable'],
    blurb: 'Fencing, fighting, true love. As you wish.',
    why: { cosy: 85, thinky: 25, funny: 85, tense: 35, romantic: 75 },
    streaming: 'Disney+', runtime: '98 min', rating: 'PG',
    colors: ['#C9A15A', '#7B4A2F', '#4A6B8C'], stripe: 'diagonal' },
  { id: 19, title: '12 Angry Men', year: 1957, director: 'Sidney Lumet',
    tags: ['tense', 'talky', 'sharp', 'classic'],
    blurb: 'One room. Twelve men. One vote to change.',
    why: { cosy: 10, thinky: 95, funny: 10, tense: 85, romantic: 5 },
    streaming: 'Prime', runtime: '96 min', rating: 'NR',
    colors: ['#3A3A3A', '#8C8C8C', '#D8D8D8'], stripe: 'vertical' },
  { id: 20, title: 'Some Like It Hot', year: 1959, director: 'Billy Wilder',
    tags: ['funny', 'screwball', 'classic', 'silly'],
    blurb: 'Two musicians, one mob, zero good disguises.',
    why: { cosy: 55, thinky: 20, funny: 95, tense: 30, romantic: 55 },
    streaming: 'Prime', runtime: '121 min', rating: 'NR',
    colors: ['#D8D8D8', '#2B2B2B', '#C9A15A'], stripe: 'horizontal' },
  { id: 12, title: 'Columbus', year: 2017, director: 'Kogonada',
    tags: ['quiet', 'architectural', 'slow', 'intimate'],
    blurb: 'A town of modernist buildings. Two strangers.',
    why: { cosy: 70, thinky: 80, funny: 10, tense: 10, romantic: 45 },
    streaming: 'MUBI', runtime: '104 min', rating: 'NR',
    colors: ['#E8E4D8', '#7A8B7F', '#4A5856'], stripe: 'vertical',
    posterPath: '/pIrljDSxECfBUBnXBW3WV2ZJbhE.jpg' },
];

export interface Reel {
  label: string;
  col: string;
  opts: string[];
}

export const REELS: Reel[] = [
  { label: 'FEEL',    col: C.pink,   opts: ['cosy', 'bittersweet', 'silly', 'thinky', 'tense', 'romantic', 'weird', 'swoony'] },
  { label: 'FLAVOUR', col: C.blue,   opts: ['neon + rain', 'cosy', 'slow burn', 'wild ride', 'escapist', 'grounded', 'cinematic'] },
  { label: 'LENGTH',  col: C.yellow, opts: ['under 90m', '~2 hrs', 'epic ok'] },
  { label: 'ERA',     col: C.mint,   opts: ["today", "'10s", "'00s", "'90s", "'80s", "classic"] },
];

type ReelState = { opts: string[]; i: number; locked: boolean };

export const FEEL_MAP: Record<string, Partial<Record<string, number>>> = {
  cosy:        { cosy: 3, funny: 1 },
  bittersweet: { romantic: 2, thinky: 2 },
  silly:       { funny: 3 },
  thinky:      { thinky: 3 },
  tense:       { tense: 3 },
  romantic:    { romantic: 3 },
  weird:       { thinky: 1, funny: 1 },
  swoony:      { romantic: 2, cosy: 1 },
};

export const FLAVOUR_MAP: Record<string, Partial<Record<string, number>>> = {
  'neon + rain': { tense: 2, thinky: 1 },
  'cosy':        { cosy: 2, funny: 1 },
  'slow burn':   { thinky: 2, romantic: 1 },
  'wild ride':   { funny: 2, tense: 1 },
  'escapist':    { cosy: 1, funny: 2 },
  'grounded':    { thinky: 2 },
  'cinematic':   { thinky: 1, romantic: 1, tense: 1 },
};

const ERA_RANGES: Record<string, [number, number]> = {
  'today':   [2020, 9999],
  "'10s":    [2010, 2019],
  "'00s":    [2000, 2009],
  "'90s":    [1990, 1999],
  "'80s":    [1980, 1989],
  'classic': [0,    1979],
};

function parseRuntime(runtime: string): number {
  const m = runtime.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 120;
}

function runtimeFits(runtime: string, lengthChoice: string): boolean {
  const mins = parseRuntime(runtime);
  if (lengthChoice === 'under 90m') return mins < 90;
  if (lengthChoice === '~2 hrs')    return mins >= 90 && mins <= 140;
  return true; // 'epic ok' — any length is fine
}

function eraFits(year: number, eraChoice: string): boolean {
  const range = ERA_RANGES[eraChoice];
  if (!range) return true;
  return year >= range[0] && year <= range[1];
}

function runtimeCloseness(runtime: string, lengthChoice: string): number {
  // Small tiebreak bonus for near-misses used when constraints are relaxed.
  const mins = parseRuntime(runtime);
  if (lengthChoice === 'under 90m') return mins < 90 ? 20 : Math.max(0, 15 - (mins - 90) / 2);
  if (lengthChoice === '~2 hrs')    return mins >= 90 && mins <= 140 ? 20 : 10;
  return 5;
}

function selectFive(
  reels: ReelState[],
  scoreFilm: (f: CatalogueFilm) => number,
): CatalogueFilm[] {
  const length = reels[2]?.opts[reels[2].i] ?? '~2 hrs';
  const era    = reels[3]?.opts[reels[3].i] ?? 'today';

  const ranked = CATALOGUE_FILMS
    .map(f => ({ film: f, score: scoreFilm(f) + runtimeCloseness(f.runtime, length) }))
    .sort((a, b) => b.score - a.score);

  // Hard-constraint tiers: honour LENGTH + ERA first, then relax ERA,
  // then LENGTH, then anything — so selections match inputs whenever
  // the catalogue allows, and we still always return 5 films.
  const tiers: Array<(f: CatalogueFilm) => boolean> = [
    f => runtimeFits(f.runtime, length) && eraFits(f.year, era),
    f => runtimeFits(f.runtime, length),
    f => eraFits(f.year, era),
    () => true,
  ];

  const picked: CatalogueFilm[] = [];
  for (const fits of tiers) {
    for (const { film } of ranked) {
      if (picked.length >= 5) return picked;
      if (!picked.includes(film) && fits(film)) picked.push(film);
    }
  }
  return picked;
}

export function matchFilms(reels: ReelState[]): CatalogueFilm[] {
  const feel    = reels[0]?.opts[reels[0].i] ?? 'thinky';
  const flavour = reels[1]?.opts[reels[1].i] ?? '';
  const feelWants    = FEEL_MAP[feel]       || { thinky: 1 };
  const flavourWants = FLAVOUR_MAP[flavour] || {};
  return selectFive(reels, f => {
    let score = 0;
    Object.entries(feelWants).forEach(([k, w]) =>
      score += (f.why[k as keyof typeof f.why] || 0) * (w || 0));
    Object.entries(flavourWants).forEach(([k, w]) =>
      score += (f.why[k as keyof typeof f.why] || 0) * ((w || 0) * 0.6));
    return score;
  });
}

export function matchFilmsGroup(reels: ReelState[], groupTaste: Record<string, number>): CatalogueFilm[] {
  const feel    = reels[0]?.opts[reels[0].i] ?? 'thinky';
  const flavour = reels[1]?.opts[reels[1].i] ?? '';
  const feelWants    = FEEL_MAP[feel]       || { thinky: 1 };
  const flavourWants = FLAVOUR_MAP[flavour] || {};
  return selectFive(reels, f => {
    let score = 0;
    Object.entries(feelWants).forEach(([k, w]) =>
      score += (f.why[k as keyof typeof f.why] || 0) * (w || 0) * 1.5);
    Object.entries(flavourWants).forEach(([k, w]) =>
      score += (f.why[k as keyof typeof f.why] || 0) * ((w || 0) * 0.9));
    Object.entries(groupTaste).forEach(([k, v]) =>
      score += (f.why[k as keyof typeof f.why] || 0) * (v / 100));
    return score;
  });
}

export function getPosterBackground(film: CatalogueFilm): string {
  const [c1, c2, c3] = film.colors;
  const patterns: Record<string, string> = {
    horizontal: `repeating-linear-gradient(180deg,${c1} 0 28px,${c2} 28px 56px,${c3} 56px 84px)`,
    diagonal:   `repeating-linear-gradient(135deg,${c1} 0 22px,${c2} 22px 44px,${c3} 44px 66px)`,
    vertical:   `repeating-linear-gradient(90deg,${c1} 0 32px,${c2} 32px 64px,${c3} 64px 96px)`,
    burst:      `radial-gradient(circle at 50% 50%,${c1} 0%,${c2} 40%,${c3} 80%)`,
    flame:      `linear-gradient(180deg,${c1} 0%,${c1} 40%,${c2} 55%,${c3} 100%)`,
    splash:     `radial-gradient(ellipse at 30% 30%,${c1} 0%,${c2} 45%,${c3} 100%)`,
    neon:       `linear-gradient(135deg,${c2} 0% 50%,${c3} 50% 100%)`,
  };
  return patterns[film.stripe] || patterns.horizontal;
}

const STREAMING_URLS: Record<string, string> = {
  'Netflix':  'https://www.netflix.com/search?q=',
  'Prime':    'https://www.amazon.co.uk/s?k=',
  'MUBI':     'https://mubi.com/en/films/',
  'Disney+':  'https://www.disneyplus.com/search/',
};

export function getStreamingUrl(film: CatalogueFilm): string {
  const base = STREAMING_URLS[film.streaming] || 'https://www.google.com/search?q=';
  return base + encodeURIComponent(film.title);
}

export const WHY_TEXT: Record<string, (title: string) => string> = {
  cosy:        () => `you said cosy — this one wraps you up like a blanket.`,
  bittersweet: (t) => `${t} is bittersweet in the best way. exactly what you asked for.`,
  thinky:      () => `big ideas, careful filmmaking. this one'll stick around in your head.`,
  tense:       (t) => `buckle up. ${t} earns every minute.`,
  romantic:    () => `not a romcom. something better — it trusts you to feel it.`,
  funny:       () => `genuinely funny. not quirky, not charming — actually funny.`,
  silly:       () => `joyful and loose. perfect for tonight.`,
  weird:       () => `strange and wonderful. not for everyone — but definitely for you.`,
  swoony:      () => `slow-burn kind. let it wash over you.`,
};
