/**
 * Enhanced Recommendation Logic
 *
 * This module provides advanced recommendation functionality that combines
 * multiple user input sources with weighted scoring and profile blending
 * for collaborative sessions.
 */

import { storage } from '../server/storage';

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

const PREFERENCE_WEIGHTS = {
  onboarding: 0.5,
  watchlist: 1.0,
  feedback: 1.5,
} as const;

export async function fetchWatchlistRatings(userId: string): Promise<Record<string, WatchlistRating>> {
  try {
    const numericId = parseInt(userId, 10);
    if (isNaN(numericId)) return {};
    const items = await storage.getWatchlistItems(numericId);
    const ratings: Record<string, WatchlistRating> = {};
    items.forEach((item) => {
      if (item.userRating != null) {
        ratings[String(item.filmId)] = {
          rating: item.userRating,
          timestamp: item.addedAt ? new Date(item.addedAt) : new Date(),
        };
      }
    });
    return ratings;
  } catch (error) {
    console.error('Error fetching watchlist ratings:', error);
    return {};
  }
}

export async function fetchRecommendationFeedback(userId: string): Promise<Record<string, RecommendationFeedback>> {
  try {
    const numericId = parseInt(userId, 10);
    if (isNaN(numericId)) return {};
    const feedbackItems = await storage.getAllFilmFeedback(numericId);
    const feedback: Record<string, RecommendationFeedback> = {};
    feedbackItems.forEach((item) => {
      feedback[String(item.filmId)] = {
        liked: item.liked,
        timestamp: item.createdAt ? new Date(item.createdAt) : new Date(),
      };
    });
    return feedback;
  } catch (error) {
    console.error('Error fetching recommendation feedback:', error);
    return {};
  }
}

export async function fetchOnboardingRatings(userId: string): Promise<Record<string, number>> {
  try {
    const numericId = parseInt(userId, 10);
    if (isNaN(numericId)) return {};
    const ratedFilms = await storage.getUserRatedFilms(numericId);
    const ratings: Record<string, number> = {};
    ratedFilms.forEach((item) => {
      ratings[String(item.filmId)] = item.rating;
    });
    return ratings;
  } catch (error) {
    console.error('Error fetching onboarding ratings:', error);
    return {};
  }
}

export async function fetchFriends(userId: string): Promise<Record<string, Friend>> {
  try {
    const numericId = parseInt(userId, 10);
    if (isNaN(numericId)) return {};
    const friends = await storage.getFriends(numericId);
    const friendMap: Record<string, Friend> = {};
    friends.forEach((friend) => {
      friendMap[String(friend.id)] = {
        displayName: friend.username,
        profilePic: friend.profilePicture ?? undefined,
      };
    });
    return friendMap;
  } catch (error) {
    console.error('Error fetching friends:', error);
    return {};
  }
}

export async function fetchSessions(_userId: string): Promise<Record<string, Session>> {
  return {};
}

export function mergePreferences(
  onboardingRatings: Record<string, number>,
  watchlistRatings: Record<string, WatchlistRating>,
  recommendationFeedback: Record<string, RecommendationFeedback>
): UserPreferenceProfile {
  const merged: UserPreferenceProfile = {};

  Object.entries(onboardingRatings).forEach(([movieId, rating]) => {
    const normalizedRating = (rating - 1) / 4;
    merged[movieId] = normalizedRating * PREFERENCE_WEIGHTS.onboarding;
  });

  Object.entries(watchlistRatings).forEach(([movieId, data]) => {
    const normalizedRating = (data.rating - 1) / 4;
    const weightedScore = normalizedRating * PREFERENCE_WEIGHTS.watchlist;
    merged[movieId] = (merged[movieId] || 0) + weightedScore;
  });

  Object.entries(recommendationFeedback).forEach(([movieId, data]) => {
    const score = data.liked ? 1 : 0;
    const weightedScore = score * PREFERENCE_WEIGHTS.feedback;
    merged[movieId] = (merged[movieId] || 0) + weightedScore;
  });

  console.log(`Merged preferences for ${Object.keys(merged).length} movies`);
  return merged;
}

export function blendUserProfiles(
  profileA: UserPreferenceProfile,
  profileB: UserPreferenceProfile
): UserPreferenceProfile {
  const blended: UserPreferenceProfile = {};
  const allMovieIds = new Set([...Object.keys(profileA), ...Object.keys(profileB)]);

  allMovieIds.forEach((movieId) => {
    const scoreA = profileA[movieId] || 0;
    const scoreB = profileB[movieId] || 0;
    if (scoreA > 0 && scoreB > 0) {
      blended[movieId] = (scoreA + scoreB) / 2;
    } else {
      blended[movieId] = scoreA || scoreB;
    }
  });

  console.log(`Blended profiles for ${allMovieIds.size} movies`);
  return blended;
}

export async function getUserPreferenceProfile(userId: string): Promise<UserPreferenceProfile> {
  try {
    console.log(`Building preference profile for user ${userId}`);
    const [onboardingRatings, watchlistRatings, recommendationFeedback] = await Promise.all([
      fetchOnboardingRatings(userId),
      fetchWatchlistRatings(userId),
      fetchRecommendationFeedback(userId),
    ]);
    const profile = mergePreferences(onboardingRatings, watchlistRatings, recommendationFeedback);
    console.log(`Built preference profile with ${Object.keys(profile).length} movies for user ${userId}`);
    return profile;
  } catch (error) {
    console.error('Error building user preference profile:', error);
    return {};
  }
}

export async function getBlendedSessionProfile(
  userIdA: string,
  userIdB: string
): Promise<UserPreferenceProfile> {
  try {
    console.log(`Building blended session profile for users ${userIdA} and ${userIdB}`);
    const [profileA, profileB] = await Promise.all([
      getUserPreferenceProfile(userIdA),
      getUserPreferenceProfile(userIdB),
    ]);
    const blendedProfile = blendUserProfiles(profileA, profileB);
    console.log(`Built blended session profile with ${Object.keys(blendedProfile).length} movies`);
    return blendedProfile;
  } catch (error) {
    console.error('Error building blended session profile:', error);
    return {};
  }
}

export async function cachePreferenceProfile(
  userId: string,
  profile: UserPreferenceProfile
): Promise<boolean> {
  console.log(`Preference profile computed for user ${userId} with ${Object.keys(profile).length} movies`);
  return true;
}

export function getTopRecommendations(
  profile: UserPreferenceProfile,
  limit: number = 10
): string[] {
  return Object.entries(profile)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, limit)
    .map(([movieId]) => movieId);
}
