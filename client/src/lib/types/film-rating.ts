/**
 * Type definition for film ratings
 * This is used across the application for rating films during onboarding
 * and in regular usage
 */
export interface FilmRating {
  filmId: number;
  filmTitle: string;
  filmPosterUrl: string;
  rating: number | null; // 1-5 stars, null means "haven't seen"
  status?: string; // "not_seen", "seen", "liked", "loved", etc.
}