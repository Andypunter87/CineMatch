import { CINEMATCH_FILMS, CINEMATCH_TAG_MAP, CinematchFilm } from './films';

export interface FilmRatingInput {
  filmId: number;
  rating: number;
}

export interface CinematicFingerprint {
  nickname: string;
  topTags: string[];
  tagWeights: Record<string, number>;
  vibeProfile: Record<string, number>;
  traitsByCategory: {
    tone: string;
    style: string;
    pace: string;
  };
  topFilmIds: number[];
  avgRating: string;
  seenCount: number;
  likedFilms: CinematchFilm[];
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function computeFingerprint(ratings: FilmRatingInput[]): CinematicFingerprint {
  const films = CINEMATCH_FILMS;

  const liked = films.filter(f => {
    const r = ratings.find(x => x.filmId === f.id);
    return r && r.rating >= 3;
  });

  const loved = films.filter(f => {
    const r = ratings.find(x => x.filmId === f.id);
    return r && r.rating >= 4;
  });

  const seen = films.filter(f => {
    const r = ratings.find(x => x.filmId === f.id);
    return r && r.rating > 0;
  });

  const tagCounts: Record<string, number> = {};
  seen.forEach(f => {
    const r = ratings.find(x => x.filmId === f.id);
    const rating = r ? r.rating : 0;
    const weight = rating / 5;
    f.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + weight;
    });
  });

  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5).map(([t]) => t);
  const mapped = top.map(t => CINEMATCH_TAG_MAP[t]?.label || t);

  const nickname =
    liked.length === 0
      ? 'The Curious Newcomer'
      : mapped.length >= 2
        ? capitalize(mapped[0]) + ' + ' + capitalize(mapped[1])
        : capitalize(mapped[0] || 'Cinephile');

  const paceTag  = top.find(t => CINEMATCH_TAG_MAP[t]?.cat === 'pace')  || 'slow';
  const styleTag = top.find(t => CINEMATCH_TAG_MAP[t]?.cat === 'style') || 'stylised';
  const toneTag  = top.find(t => CINEMATCH_TAG_MAP[t]?.cat === 'tone')  || 'bittersweet';

  const sortByRating = (films: CinematchFilm[]) =>
    [...films].sort((a, b) => {
      const ra = ratings.find(x => x.filmId === a.id)?.rating || 0;
      const rb = ratings.find(x => x.filmId === b.id)?.rating || 0;
      return rb - ra;
    });

  const sigPicks = sortByRating(loved.length > 0 ? loved : liked).slice(0, 3);
  const topFilmIds = sigPicks.map(f => f.id);

  const vibeTagMap: Record<string, string[]> = {
    cosy:     ['warm', 'cosy', 'whimsical'],
    thinky:   ['clever', 'melancholic', 'weird', 'dark'],
    funny:    ['funny', 'british'],
    tense:    ['tense', 'dark'],
    romantic: ['romantic', 'emotional', 'warm'],
  };
  const vibeProfile: Record<string, number> = {};
  for (const [vibe, tags] of Object.entries(vibeTagMap)) {
    vibeProfile[vibe] = tags.reduce((sum, t) => sum + (tagCounts[t] || 0), 0);
  }

  const ratingValues = ratings.filter(r => r.rating > 0).map(r => r.rating);
  const avgRating =
    ratingValues.length > 0
      ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
      : '—';

  return {
    nickname,
    topTags: top,
    tagWeights: tagCounts,
    vibeProfile,
    traitsByCategory: {
      tone:  CINEMATCH_TAG_MAP[toneTag]?.label  || toneTag,
      style: CINEMATCH_TAG_MAP[styleTag]?.label || styleTag,
      pace:  CINEMATCH_TAG_MAP[paceTag]?.label  || paceTag,
    },
    topFilmIds,
    avgRating,
    seenCount: seen.length,
    likedFilms: liked,
  };
}
