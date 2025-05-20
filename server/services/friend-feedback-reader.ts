/**
 * Friend Feedback Reader Service
 * 
 * This service fetches a friend's preferences and feedback from Firestore
 * to provide combined recommendations for co-watching scenarios.
 */

import { getFirestoreDb } from '../firebase-admin';
import { getUserFilmFeedback, extractPreferenceWeights } from './firestore-feedback-reader';
import { RecommendationRequest } from '@shared/schema';

/**
 * Get friend's preferences from Firestore
 * @param friendUserId The friend's user ID
 * @returns Friend preferences or null if not found
 */
export async function getFriendPreferences(
  friendUserId: number
): Promise<Record<string, any> | null> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.warn('Firestore not initialized for friend preferences retrieval');
      return null;
    }

    // Get preferences document from friend's path
    const preferencesPath = `users/${friendUserId}/preferences/settings`;
    const preferencesDoc = await db.doc(preferencesPath).get();

    if (!preferencesDoc.exists) {
      console.log(`No preferences found in Firestore for friend ${friendUserId}`);
      return null;
    }

    // Return the preferences data
    return preferencesDoc.data() as Record<string, any>;
  } catch (error) {
    console.error('Error retrieving friend preferences from Firestore:', error);
    return null;
  }
}

/**
 * Generate a personalization summary for co-watching
 * @param username User name
 * @param friendName Friend name 
 * @param sharedMoods List of shared mood preferences
 * @param sharedGenres List of shared genre preferences
 * @returns Personalization summary string
 */
export function generatePersonalizationSummary(
  username: string = 'You',
  friendName: string = 'your friend',
  sharedMoods: string[] = [],
  sharedGenres: string[] = []
): string {
  // If no shared preferences, default message
  if (sharedMoods.length === 0 && sharedGenres.length === 0) {
    return `Recommendations for watching with ${friendName}`;
  }

  // Format the mood name nicely
  const formatMood = (mood: string): string => {
    const moodMap: Record<string, string> = {
      'laugh': 'comedy',
      'think': 'thought-provoking films',
      'cry': 'emotional stories',
      'thrill': 'thrilling content',
      'escape': 'escapist entertainment',
      'inspire': 'inspiring stories'
    };
    return moodMap[mood] || mood;
  };

  // If we have shared moods and genres
  if (sharedMoods.length > 0 && sharedGenres.length > 0) {
    const mood = formatMood(sharedMoods[0]);
    const genre = sharedGenres[0];
    return `${username} and ${friendName} both enjoy ${mood} and ${genre} films`;
  }
  
  // If we only have shared moods
  if (sharedMoods.length > 0) {
    const mood = formatMood(sharedMoods[0]);
    return `${username} and ${friendName} both enjoy ${mood}`;
  }
  
  // If we only have shared genres
  if (sharedGenres.length > 0) {
    const genre = sharedGenres[0];
    return `${username} and ${friendName} both enjoy ${genre} films`;
  }

  return `Recommendations for watching with ${friendName}`;
}

/**
 * Combine preferences from user and friend for co-watching
 * @param userPreferences User's recommendation preferences
 * @param friendPreferences Friend's stored preferences from Firestore
 * @param weightRatio Weight ratio between user (1.0) and friend (0.0) preferences (default 0.5 = equal)
 * @returns Combined preferences object
 */
export function combinePreferences(
  userPreferences: RecommendationRequest,
  friendPreferences: Record<string, any>,
  weightRatio: number = 0.5
): RecommendationRequest {
  // Start with a copy of user preferences
  const combinedPreferences: RecommendationRequest = { ...userPreferences };
  
  // If no friend preferences, return user preferences unchanged
  if (!friendPreferences) {
    return combinedPreferences;
  }

  // Combine mood preferences if friend has a preference
  if (friendPreferences.mood && typeof friendPreferences.mood === 'string') {
    // If weight ratio favors friend more than user, use friend's mood
    if (weightRatio < 0.5) {
      combinedPreferences.mood = friendPreferences.mood as any;
    }
    // Otherwise, keep the user's mood (already in combinedPreferences)
  }
  
  // Combine runtime preferences if friend has preferences
  if (friendPreferences.runtime && Array.isArray(friendPreferences.runtime)) {
    // Find overlapping runtime preferences
    const userRuntimes = combinedPreferences.runtime || [];
    const friendRuntimes = friendPreferences.runtime;
    
    // Find common runtime preferences
    const commonRuntimes = userRuntimes.filter(rt => 
      friendRuntimes.includes(rt)
    );
    
    // If there are common preferences, use those
    if (commonRuntimes.length > 0) {
      combinedPreferences.runtime = commonRuntimes;
    }
    // Otherwise, keep user preferences
  }
  
  // Combine streaming services with priority to overlapping services
  if (friendPreferences.streamingServices && Array.isArray(friendPreferences.streamingServices)) {
    const userServices = combinedPreferences.streamingServices || [];
    const friendServices = friendPreferences.streamingServices;
    
    // Find common streaming services
    const commonServices = userServices.filter(service => 
      friendServices.includes(service)
    );
    
    // If there are common services, use those
    if (commonServices.length > 0) {
      combinedPreferences.streamingServices = commonServices;
    }
    // Otherwise, keep user's services
  }
  
  return combinedPreferences;
}

/**
 * Combine feedback weights from user and friend for co-watching recommendations
 * @param userWeights User's preference weights derived from feedback
 * @param friendWeights Friend's preference weights derived from feedback
 * @param weightRatio Weight ratio between user (1.0) and friend (0.0) preferences (default 0.5 = equal)
 * @returns Combined weights object
 */
export function combineWeights(
  userWeights: any,
  friendWeights: any,
  weightRatio: number = 0.5
): any {
  // If either set of weights is missing, return the other
  if (!userWeights.hasPreferences) return friendWeights;
  if (!friendWeights.hasPreferences) return userWeights;
  
  // Initialize combined weights
  const combinedWeights = {
    moodWeights: { ...userWeights.moodWeights },
    runtimeWeights: { ...userWeights.runtimeWeights },
    hasPreferences: true
  };
  
  // Helper function to combine weight entries
  const combineWeightEntries = (
    userEntry: { liked: number, disliked: number } | undefined,
    friendEntry: { liked: number, disliked: number } | undefined,
    weightRatio: number
  ) => {
    if (!userEntry && !friendEntry) return undefined;
    if (!userEntry) return friendEntry;
    if (!friendEntry) return userEntry;
    
    // If either person strongly dislikes something, heavily penalize it
    // This ensures we don't recommend things one person would hate
    const userDislikes = userEntry.disliked > userEntry.liked;
    const friendDislikes = friendEntry.disliked > friendEntry.liked;
    
    if (userDislikes || friendDislikes) {
      return {
        liked: 0,
        disliked: Math.max(userEntry.disliked, friendEntry.disliked)
      };
    }
    
    // Otherwise, weight the preferences
    return {
      liked: Math.round(userEntry.liked * weightRatio + friendEntry.liked * (1 - weightRatio)),
      disliked: Math.round(userEntry.disliked * weightRatio + friendEntry.disliked * (1 - weightRatio))
    };
  };
  
  // Combine mood weights
  const allMoodKeys = [
    ...Object.keys(userWeights.moodWeights),
    ...Object.keys(friendWeights.moodWeights)
  ];
  
  // Get unique mood keys
  const uniqueMoodKeys = Array.from(new Set(allMoodKeys));
  
  // Process each mood key
  uniqueMoodKeys.forEach(mood => {
    combinedWeights.moodWeights[mood] = combineWeightEntries(
      userWeights.moodWeights[mood],
      friendWeights.moodWeights[mood],
      weightRatio
    );
  });
  
  // Combine runtime weights
  const allRuntimeKeys = [
    ...Object.keys(userWeights.runtimeWeights),
    ...Object.keys(friendWeights.runtimeWeights)
  ];
  
  // Get unique runtime keys
  const uniqueRuntimeKeys = Array.from(new Set(allRuntimeKeys));
  
  // Process each runtime key
  uniqueRuntimeKeys.forEach(runtime => {
    combinedWeights.runtimeWeights[runtime] = combineWeightEntries(
      userWeights.runtimeWeights[runtime],
      friendWeights.runtimeWeights[runtime],
      weightRatio
    );
  });
  
  return combinedWeights;
}