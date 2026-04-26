export const C = {
  paper: '#FAF6EE',
  paper2: '#F3ECDA',
  ink: '#1A1A1A',
  inkSoft: '#4A4A4A',
  inkLight: '#8A8478',
  pink: '#FF4D8F',
  yellow: '#FFC93C',
  blue: '#4D6EFF',
  mint: '#5FD4A8',
  lilac: '#C9A7FF',
  coral: '#FF8C5A',
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

function runtimeBonus(runtime: string, lengthChoice: string): number {
  const mins = parseRuntime(runtime);
  if (lengthChoice === 'under 90m') return mins < 90 ? 20 : mins <= 105 ? 5 : -10;
  if (lengthChoice === '~2 hrs')    return mins >= 90 && mins <= 130 ? 20 : mins < 90 ? 0 : -5;
  return 5;
}

function eraBonus(year: number, eraChoice: string): number {
  const range = ERA_RANGES[eraChoice];
  if (!range) return 0;
  return year >= range[0] && year <= range[1] ? 18 : 0;
}

export function matchFilms(reels: ReelState[]): CatalogueFilm[] {
  const feel    = reels[0]?.opts[reels[0].i] ?? 'thinky';
  const flavour = reels[1]?.opts[reels[1].i] ?? '';
  const length  = reels[2]?.opts[reels[2].i] ?? '~2 hrs';
  const era     = reels[3]?.opts[reels[3].i] ?? 'today';
  const feelWants    = FEEL_MAP[feel]       || { thinky: 1 };
  const flavourWants = FLAVOUR_MAP[flavour] || {};
  return CATALOGUE_FILMS
    .map(f => {
      let score = 0;
      Object.entries(feelWants).forEach(([k, w]) =>
        score += (f.why[k as keyof typeof f.why] || 0) * (w || 0));
      Object.entries(flavourWants).forEach(([k, w]) =>
        score += (f.why[k as keyof typeof f.why] || 0) * ((w || 0) * 0.6));
      score += runtimeBonus(f.runtime, length);
      score += eraBonus(f.year, era);
      return { film: f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.film);
}

export function matchFilmsGroup(reels: ReelState[], groupTaste: Record<string, number>): CatalogueFilm[] {
  const feel    = reels[0]?.opts[reels[0].i] ?? 'thinky';
  const flavour = reels[1]?.opts[reels[1].i] ?? '';
  const length  = reels[2]?.opts[reels[2].i] ?? '~2 hrs';
  const era     = reels[3]?.opts[reels[3].i] ?? 'today';
  const feelWants    = FEEL_MAP[feel]       || { thinky: 1 };
  const flavourWants = FLAVOUR_MAP[flavour] || {};
  return CATALOGUE_FILMS
    .map(f => {
      let score = 0;
      Object.entries(feelWants).forEach(([k, w]) =>
        score += (f.why[k as keyof typeof f.why] || 0) * (w || 0) * 1.5);
      Object.entries(flavourWants).forEach(([k, w]) =>
        score += (f.why[k as keyof typeof f.why] || 0) * ((w || 0) * 0.9));
      Object.entries(groupTaste).forEach(([k, v]) =>
        score += (f.why[k as keyof typeof f.why] || 0) * (v / 100));
      score += runtimeBonus(f.runtime, length);
      score += eraBonus(f.year, era);
      return { film: f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.film);
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
