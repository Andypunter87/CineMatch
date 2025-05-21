/**
 * Firestore Path Utilities
 * 
 * This file provides consistent path formatting for all Firestore collections and documents
 * to ensure data is stored and retrieved from the correct locations.
 */

/**
 * Standard Firestore paths for the application
 */
export const FirestorePaths = {
  // User data
  USER_ROOT: (userId: string | number) => `users/${userId}`,
  USER_PREFERENCES: (userId: string | number) => `users/${userId}/preferences/settings`,
  USER_ONBOARDING_STATE: (userId: string | number) => `users/${userId}/preferences/onboarding`,
  
  // Ratings
  ONBOARDING_RATINGS: (userId: string | number) => `users/${userId}/ratings/onboarding`,
  RECOMMENDATION_RATINGS: (userId: string | number) => `users/${userId}/ratings/recommendations`,
  
  // Feedback
  FILM_FEEDBACK: (userId: string | number) => `users/${userId}/feedback`,
  FILM_FEEDBACK_ITEM: (userId: string | number, filmId: number) => 
    `users/${userId}/feedback/${filmId}`,
  
  // Watchlist
  WATCHLIST: (userId: string | number) => `users/${userId}/watchlist`,
  WATCHLIST_ITEM: (userId: string | number, filmId: number) => 
    `users/${userId}/watchlist/${filmId}`,
  
  // History
  RECOMMENDATION_HISTORY: (userId: string | number) => `users/${userId}/history/recommendations`,
}

/**
 * Format a user path with subcollections
 * @param userId User ID
 * @param subPath Optional subpath (collection/doc/subcollection)
 * @returns Fully formatted Firestore path
 */
export function formatUserPath(userId: string | number, subPath?: string): string {
  const basePath = `users/${userId}`;
  return subPath ? `${basePath}/${subPath}` : basePath;
}

/**
 * Get the document ID for a specific film in a user collection
 * @param filmId Film ID
 * @returns Document ID to use in Firestore
 */
export function getFilmDocId(filmId: number): string {
  return `film_${filmId}`;
}