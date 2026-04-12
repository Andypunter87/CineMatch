/**
 * Friend Feedback Reader Service
 * 
 * Fetches a friend's preferences and feedback from PostgreSQL
 * for combined recommendations in co-watching scenarios.
 */

import { storage } from '../storage';
import { RecommendationRequest } from '@shared/schema';

/**
 * Get friend's preferences from the database
 */
export async function getFriendPreferences(
  friendUserId: number
): Promise<Record<string, any> | null> {
  try {
    const user = await storage.getUser(friendUserId);
    if (!user) return null;

    return {
      country: user.country,
      streamingServices: user.streamingServices,
    };
  } catch (error) {
    console.error('Error retrieving friend preferences:', error);
    return null;
  }
}

/**
 * Generate a personalization summary for co-watching
 */
export function generatePersonalizationSummary(
  username: string = 'You',
  friendName: string = 'your friend',
  sharedMoods: string[] = [],
  sharedGenres: string[] = []
): string {
  if (sharedMoods.length === 0 && sharedGenres.length === 0) {
    return `Recommendations for watching with ${friendName}`;
  }

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

  if (sharedMoods.length > 0 && sharedGenres.length > 0) {
    const mood = formatMood(sharedMoods[0]);
    const genre = sharedGenres[0];
    return `${username} and ${friendName} both enjoy ${mood} and ${genre} films`;
  }

  if (sharedMoods.length > 0) {
    const mood = formatMood(sharedMoods[0]);
    return `${username} and ${friendName} both enjoy ${mood}`;
  }

  if (sharedGenres.length > 0) {
    const genre = sharedGenres[0];
    return `${username} and ${friendName} both enjoy ${genre} films`;
  }

  return `Recommendations for watching with ${friendName}`;
}

/**
 * Combine preferences from user and friend for co-watching
 */
export function combinePreferences(
  userPreferences: RecommendationRequest,
  friendPreferences: Record<string, any>,
  weightRatio: number = 0.5
): RecommendationRequest {
  const combinedPreferences: RecommendationRequest = { ...userPreferences };

  if (!friendPreferences) return combinedPreferences;

  if (friendPreferences.mood && typeof friendPreferences.mood === 'string') {
    if (weightRatio < 0.5) {
      combinedPreferences.mood = friendPreferences.mood as any;
    }
  }

  if (friendPreferences.runtime && Array.isArray(friendPreferences.runtime)) {
    const userRuntimes = combinedPreferences.runtime || [];
    const friendRuntimes = friendPreferences.runtime;
    const commonRuntimes = userRuntimes.filter(rt => friendRuntimes.includes(rt));
    if (commonRuntimes.length > 0) {
      combinedPreferences.runtime = commonRuntimes;
    }
  }

  if (friendPreferences.streamingServices && Array.isArray(friendPreferences.streamingServices)) {
    const userServices = combinedPreferences.streamingServices || [];
    const friendServices = friendPreferences.streamingServices;
    const commonServices = userServices.filter(service => friendServices.includes(service));
    if (commonServices.length > 0) {
      combinedPreferences.streamingServices = commonServices;
    }
  }

  return combinedPreferences;
}

/**
 * Combine feedback weights from user and friend for co-watching recommendations
 */
export function combineWeights(
  userWeights: any,
  friendWeights: any,
  weightRatio: number = 0.5
): any {
  if (!userWeights.hasPreferences) return friendWeights;
  if (!friendWeights.hasPreferences) return userWeights;

  const combinedWeights = {
    moodWeights: { ...userWeights.moodWeights },
    runtimeWeights: { ...userWeights.runtimeWeights },
    hasPreferences: true
  };

  const combineWeightEntries = (
    userEntry: { liked: number, disliked: number } | undefined,
    friendEntry: { liked: number, disliked: number } | undefined,
    ratio: number
  ) => {
    if (!userEntry && !friendEntry) return undefined;
    if (!userEntry) return friendEntry;
    if (!friendEntry) return userEntry;

    const userDislikes = userEntry.disliked > userEntry.liked;
    const friendDislikes = friendEntry.disliked > friendEntry.liked;

    if (userDislikes || friendDislikes) {
      return { liked: 0, disliked: Math.max(userEntry.disliked, friendEntry.disliked) };
    }

    return {
      liked: Math.round(userEntry.liked * ratio + friendEntry.liked * (1 - ratio)),
      disliked: Math.round(userEntry.disliked * ratio + friendEntry.disliked * (1 - ratio))
    };
  };

  const uniqueMoodKeys = Array.from(new Set([
    ...Object.keys(userWeights.moodWeights),
    ...Object.keys(friendWeights.moodWeights)
  ]));

  uniqueMoodKeys.forEach(mood => {
    combinedWeights.moodWeights[mood] = combineWeightEntries(
      userWeights.moodWeights[mood],
      friendWeights.moodWeights[mood],
      weightRatio
    );
  });

  const uniqueRuntimeKeys = Array.from(new Set([
    ...Object.keys(userWeights.runtimeWeights),
    ...Object.keys(friendWeights.runtimeWeights)
  ]));

  uniqueRuntimeKeys.forEach(runtime => {
    combinedWeights.runtimeWeights[runtime] = combineWeightEntries(
      userWeights.runtimeWeights[runtime],
      friendWeights.runtimeWeights[runtime],
      weightRatio
    );
  });

  return combinedWeights;
}
