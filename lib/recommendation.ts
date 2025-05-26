/**
 * Enhanced Recommendation Logic
 * 
 * This module provides advanced recommendation functionality that combines
 * multiple user input sources with weighted scoring and profile blending
 * for collaborative sessions.
 */

// Use the existing Firebase admin setup from server
import { getFirestoreDb } from '../server/firebase-admin';

// Type definitions for new Firestore collections
export interface WatchlistRating {
  rating: number;
  timestamp: Date;
}

export interface RecommendationFeedback {
  liked: boolean;
  timestamp: Date;
}

export interface Friend {
  displayName: string;
  profilePic?: string;
}

export interface Session {
  members: string[];
  preferencesBlended: boolean;
  created: Date;
}

export interface UserPreferenceProfile {
  [movieId: string]: number;
}

// Weighting system for different input sources
const PREFERENCE_WEIGHTS = {
  onboarding: 0.5,
  watchlist: 1.0,
  feedback: 1.5
} as const;

/**
 * Fetch watchlist ratings for a user
 * @param userId User ID
 * @returns Promise with watchlist ratings map
 */
export async function fetchWatchlistRatings(userId: string): Promise<Record<string, WatchlistRating>> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('Firestore not available for watchlist ratings');
      return {};
    }
    
    const ratingsPath = `users/${userId}/watchlistRatings`;
    const ratingsRef = db.collection(ratingsPath);
    const snapshot = await ratingsRef.get();

    const ratings: Record<string, WatchlistRating> = {};
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      ratings[doc.id] = {
        rating: data.rating,
        timestamp: data.timestamp?.toDate() || new Date(data.timestamp)
      };
    });

    console.log(`Fetched ${Object.keys(ratings).length} watchlist ratings for user ${userId}`);
    return ratings;
  } catch (error) {
    console.error("Error fetching watchlist ratings:", error);
    return {};
  }
}

/**
 * Fetch recommendation feedback for a user
 * @param userId User ID
 * @returns Promise with recommendation feedback map
 */
export async function fetchRecommendationFeedback(userId: string): Promise<Record<string, RecommendationFeedback>> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('Firestore not available for recommendation feedback');
      return {};
    }
    
    const feedbackPath = `users/${userId}/recommendationFeedback`;
    const feedbackRef = db.collection(feedbackPath);
    const snapshot = await feedbackRef.get();

    const feedback: Record<string, RecommendationFeedback> = {};
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      feedback[doc.id] = {
        liked: data.liked,
        timestamp: data.timestamp?.toDate() || new Date(data.timestamp)
      };
    });

    console.log(`Fetched ${Object.keys(feedback).length} recommendation feedback items for user ${userId}`);
    return feedback;
  } catch (error) {
    console.error("Error fetching recommendation feedback:", error);
    return {};
  }
}

/**
 * Fetch onboarding ratings for a user
 * @param userId User ID
 * @returns Promise with onboarding ratings map
 */
export async function fetchOnboardingRatings(userId: string): Promise<Record<string, number>> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('Firestore not available for onboarding ratings');
      return {};
    }
    
    const ratingsPath = `users/${userId}/ratings/onboarding`;
    const ratingsDoc = db.doc(ratingsPath);
    const snapshot = await ratingsDoc.get();

    if (!snapshot.exists) {
      console.log(`No onboarding ratings found for user ${userId}`);
      return {};
    }

    const data = snapshot.data();
    const ratings: Record<string, number> = {};
    
    // Convert the ratings array to a map
    if (data.ratings && Array.isArray(data.ratings)) {
      data.ratings.forEach((rating: any) => {
        if (rating.filmId && rating.rating) {
          ratings[rating.filmId.toString()] = rating.rating;
        }
      });
    }

    console.log(`Fetched ${Object.keys(ratings).length} onboarding ratings for user ${userId}`);
    return ratings;
  } catch (error) {
    console.error("Error fetching onboarding ratings:", error);
    return {};
  }
}

/**
 * Fetch friends for a user
 * @param userId User ID
 * @returns Promise with friends map
 */
export async function fetchFriends(userId: string): Promise<Record<string, Friend>> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('Firestore not available for friends');
      return {};
    }
    
    const friendsPath = `users/${userId}/friends`;
    const friendsRef = db.collection(friendsPath);
    const snapshot = await friendsRef.get();

    const friends: Record<string, Friend> = {};
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      friends[doc.id] = {
        displayName: data.displayName,
        profilePic: data.profilePic
      };
    });

    console.log(`Fetched ${Object.keys(friends).length} friends for user ${userId}`);
    return friends;
  } catch (error) {
    console.error("Error fetching friends:", error);
    return {};
  }
}

/**
 * Fetch sessions for a user
 * @param userId User ID
 * @returns Promise with sessions map
 */
export async function fetchSessions(userId: string): Promise<Record<string, Session>> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('Firestore not available for sessions');
      return {};
    }
    
    const sessionsPath = `users/${userId}/sessions`;
    const sessionsRef = db.collection(sessionsPath);
    const snapshot = await sessionsRef.get();

    const sessions: Record<string, Session> = {};
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      sessions[doc.id] = {
        members: data.members || [],
        preferencesBlended: data.preferencesBlended || false,
        created: data.created?.toDate() || new Date(data.created)
      };
    });

    console.log(`Fetched ${Object.keys(sessions).length} sessions for user ${userId}`);
    return sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return {};
  }
}

/**
 * Merge preferences from multiple sources with weighted scoring
 * @param onboardingRatings Ratings from onboarding (weight: 0.5)
 * @param watchlistRatings Ratings from watchlist (weight: 1.0)
 * @param recommendationFeedback Feedback from recommendations (weight: 1.5)
 * @returns Merged preference profile
 */
export function mergePreferences(
  onboardingRatings: Record<string, number>,
  watchlistRatings: Record<string, WatchlistRating>,
  recommendationFeedback: Record<string, RecommendationFeedback>
): UserPreferenceProfile {
  const merged: UserPreferenceProfile = {};

  // Process onboarding ratings (weight: 0.5)
  Object.entries(onboardingRatings).forEach(([movieId, rating]) => {
    // Normalize rating to 0-1 scale (assuming ratings are 1-5)
    const normalizedRating = (rating - 1) / 4;
    merged[movieId] = normalizedRating * PREFERENCE_WEIGHTS.onboarding;
  });

  // Process watchlist ratings (weight: 1.0)
  Object.entries(watchlistRatings).forEach(([movieId, data]) => {
    // Normalize rating to 0-1 scale (assuming ratings are 1-5)
    const normalizedRating = (data.rating - 1) / 4;
    const weightedScore = normalizedRating * PREFERENCE_WEIGHTS.watchlist;
    
    // Add to existing score or create new entry
    merged[movieId] = (merged[movieId] || 0) + weightedScore;
  });

  // Process recommendation feedback (weight: 1.5)
  Object.entries(recommendationFeedback).forEach(([movieId, data]) => {
    // Convert boolean liked to 0/1 score
    const score = data.liked ? 1 : 0;
    const weightedScore = score * PREFERENCE_WEIGHTS.feedback;
    
    // Add to existing score or create new entry
    merged[movieId] = (merged[movieId] || 0) + weightedScore;
  });

  console.log(`Merged preferences for ${Object.keys(merged).length} movies`);
  return merged;
}

/**
 * Blend two user preference profiles by averaging their scores
 * @param profileA First user's preference profile
 * @param profileB Second user's preference profile
 * @returns Blended preference profile
 */
export function blendUserProfiles(
  profileA: UserPreferenceProfile,
  profileB: UserPreferenceProfile
): UserPreferenceProfile {
  const blended: UserPreferenceProfile = {};
  
  // Get all unique movie IDs from both profiles
  const allMovieIds = new Set([
    ...Object.keys(profileA),
    ...Object.keys(profileB)
  ]);

  // Average scores for each movie
  allMovieIds.forEach(movieId => {
    const scoreA = profileA[movieId] || 0;
    const scoreB = profileB[movieId] || 0;
    
    // Average the scores (if one user hasn't rated, use the other's score)
    if (scoreA > 0 && scoreB > 0) {
      blended[movieId] = (scoreA + scoreB) / 2;
    } else {
      blended[movieId] = scoreA || scoreB;
    }
  });

  console.log(`Blended profiles for ${allMovieIds.size} movies`);
  return blended;
}

/**
 * Get a complete user preference profile combining all input sources
 * @param userId User ID
 * @returns Promise with complete preference profile
 */
export async function getUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile> {
  try {
    console.log(`Building preference profile for user ${userId}`);
    
    // Fetch all data sources in parallel
    const [onboardingRatings, watchlistRatings, recommendationFeedback] = await Promise.all([
      fetchOnboardingRatings(userId),
      fetchWatchlistRatings(userId),
      fetchRecommendationFeedback(userId)
    ]);

    // Merge all sources with weighted scoring
    const profile = mergePreferences(onboardingRatings, watchlistRatings, recommendationFeedback);
    
    console.log(`Built preference profile with ${Object.keys(profile).length} movies for user ${userId}`);
    return profile;
  } catch (error) {
    console.error("Error building user preference profile:", error);
    return {};
  }
}

/**
 * Get a blended session profile for two users
 * @param userIdA First user ID
 * @param userIdB Second user ID
 * @returns Promise with blended preference profile
 */
export async function getBlendedSessionProfile(
  userIdA: string,
  userIdB: string
): Promise<UserPreferenceProfile> {
  try {
    console.log(`Building blended session profile for users ${userIdA} and ${userIdB}`);
    
    // Get individual preference profiles
    const [profileA, profileB] = await Promise.all([
      getUserPreferenceProfile(userIdA),
      getUserPreferenceProfile(userIdB)
    ]);

    // Blend the profiles
    const blendedProfile = blendUserProfiles(profileA, profileB);
    
    console.log(`Built blended session profile with ${Object.keys(blendedProfile).length} movies`);
    return blendedProfile;
  } catch (error) {
    console.error("Error building blended session profile:", error);
    return {};
  }
}

/**
 * Cache a merged preference profile in Firestore (optional enhancement)
 * @param userId User ID
 * @param profile Preference profile to cache
 * @returns Promise with success status
 */
export async function cachePreferenceProfile(
  userId: string,
  profile: UserPreferenceProfile
): Promise<boolean> {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    const cachePath = `users/${userId}/preferences/cached`;
    const cacheDoc = doc(firestore, cachePath);
    
    await setDoc(cacheDoc, {
      profile,
      lastUpdated: new Date(),
      movieCount: Object.keys(profile).length
    });

    console.log(`Cached preference profile for user ${userId} with ${Object.keys(profile).length} movies`);
    return true;
  } catch (error) {
    console.error("Error caching preference profile:", error);
    return false;
  }
}

/**
 * Get top recommended movie IDs from a preference profile (optional enhancement)
 * @param profile User preference profile
 * @param limit Number of top recommendations to return
 * @returns Array of movie IDs sorted by descending score
 */
export function getTopRecommendations(
  profile: UserPreferenceProfile,
  limit: number = 10
): string[] {
  return Object.entries(profile)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, limit)
    .map(([movieId]) => movieId);
}