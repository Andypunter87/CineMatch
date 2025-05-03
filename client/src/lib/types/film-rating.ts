/**
 * Type definition for film ratings
 * This is used across the application for rating films during onboarding
 * and in regular usage
 */
export interface FilmRating {
  filmId: number;
  filmTitle?: string;  // Old field, keeping for compatibility
  filmPosterUrl?: string; // Old field, keeping for compatibility
  title?: string;      // New field for Firestore schema
  posterUrl?: string;  // New field for Firestore schema
  rating: number | null; // 1-5 stars, null means "haven't seen"
  status?: string; // "not_seen", "seen", "liked", "loved", "completed", etc.
  timestamp?: string; // ISO string date when the rating was created/updated
}

/**
 * Type for the Firestore onboarding rating document
 */
export interface OnboardingRating {
  filmId: number;
  title: string;
  rating: number;
  status: string; 
  timestamp: string;
}

/**
 * Type for the Firestore recommendation rating document
 */
export interface RecommendationRating {
  filmId: number;
  title: string;
  rating: 'good' | 'bad';
  timestamp: string;
}