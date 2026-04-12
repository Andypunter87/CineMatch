/**
 * Stub implementation of useFirestoreCollections.
 * All Firestore operations have been migrated to the PostgreSQL-backed REST API.
 * This stub keeps the hook interface intact so existing callers continue to compile,
 * while silently deferring to the relevant API endpoints where needed.
 */
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { RecommendationRequest } from '@shared/schema';

export type { OnboardingRating, RecommendationRating } from '@/lib/types/film-rating';

export function useFirestoreCollections() {
  const [error, setError] = useState<Error | null>(null);

  // ── Watchlist ────────────────────────────────────────────────────────────
  const addToWatchlist = async (
    _userId: string | number,
    filmId: number,
    filmData: {
      title: string;
      year?: number;
      genres?: string[];
      posterUrl?: string;
      source?: string;
      recommendationContext?: RecommendationRequest;
    },
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('POST', '/api/watchlist', {
        filmId,
        filmTitle: filmData.title,
        filmYear: filmData.year,
        filmGenres: filmData.genres,
        filmPosterUrl: filmData.posterUrl,
        recommendationContext: filmData.recommendationContext,
      });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const removeFromWatchlist = async (
    _userId: string | number,
    filmId: number,
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('DELETE', `/api/watchlist/${filmId}`);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const getWatchlist = async (
    _userId: string | number,
    _options: any = {}
  ): Promise<any[]> => {
    try {
      const res = await apiRequest('GET', '/api/watchlist');
      return res.json();
    } catch (err) {
      setError(err as Error);
      return [];
    }
  };

  // ── Film Feedback ─────────────────────────────────────────────────────────
  const saveFilmFeedback = async (
    _userId: string | number,
    filmId: number,
    feedbackData: {
      filmId: number;
      title: string;
      liked: boolean;
      timestamp: string;
      moodContext?: string | null;
      runtimePreference?: string[] | null;
      recommendationContext?: RecommendationRequest | null;
    },
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('POST', '/api/feedback', {
        filmId,
        filmTitle: feedbackData.title,
        feedback: feedbackData.liked ? 'like' : 'dislike',
        moodContext: feedbackData.moodContext,
        runtimePreference: feedbackData.runtimePreference,
        recommendationContext: feedbackData.recommendationContext,
      });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const getFilmFeedback = async (
    _userId: string | number,
    filmId: number,
    _options: any = {}
  ): Promise<any | null> => {
    try {
      const res = await apiRequest('GET', `/api/feedback/${filmId}`);
      const data = await res.json();
      return data.feedback || null;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  // ── Onboarding Ratings ────────────────────────────────────────────────────
  const saveOnboardingRating = async (
    _userId: string | number,
    _filmId: number,
    _ratingData: any,
    _options: any = {}
  ): Promise<boolean> => {
    // Onboarding ratings are saved via /api/onboarding routes
    return true;
  };

  const saveRecommendationRating = async (
    _userId: string | number,
    _filmId: number,
    _ratingData: any,
    _options: any = {}
  ): Promise<boolean> => {
    return true;
  };

  const getOnboardingRatings = async (
    _userId: string | number,
    _options: any = {}
  ): Promise<any[]> => {
    try {
      const res = await apiRequest('GET', '/api/onboarding/ratings');
      const data = await res.json();
      return data.ratings || [];
    } catch {
      return [];
    }
  };

  const queryCollection = async <T>(
    _collectionPath: string,
    _queryConstraints: any[] = [],
    _orderByFields: any[] = [],
    _limitCount: number = 0,
    _options: any = {}
  ): Promise<T[]> => {
    return [];
  };

  // ── User Preferences ──────────────────────────────────────────────────────
  const saveUserPreferences = async (
    _userId: string | number,
    preferences: { country?: string; streamingServices?: string[]; updatedAt?: string },
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('PUT', '/api/preferences', {
        country: preferences.country,
        streamingServices: preferences.streamingServices,
      });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const getUserPreferences = async (
    _userId: string | number,
    _options: any = {}
  ): Promise<any | null> => {
    try {
      const res = await apiRequest('GET', '/api/preferences');
      const data = await res.json();
      return data.preferences || null;
    } catch {
      return null;
    }
  };

  const getUserData = async (
    _userId: string | number,
    _options: any = {}
  ): Promise<any | null> => {
    try {
      const res = await apiRequest('GET', '/api/user');
      return res.json();
    } catch {
      return null;
    }
  };

  const updateOnboardingStatus = async (
    _userId: string | number,
    status: { step: number; progress: number; completed: boolean; updatedAt?: string },
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('POST', '/api/onboarding/status', status);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  // ── Friends ───────────────────────────────────────────────────────────────
  const addFriend = async (
    _userId: string | number,
    friendId: string | number,
    _friendData?: any,
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('POST', '/api/friends/add', { friendId });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const updateFriendStatus = async (
    _userId: string | number,
    friendId: string | number,
    status: string,
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('PATCH', '/api/friends/update', { friendId, status });
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const removeFriend = async (
    _userId: string | number,
    friendId: string | number,
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('DELETE', `/api/friends/${friendId}`);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const getFriends = async (
    _userId: string | number,
    _options: any = {}
  ): Promise<any[]> => {
    try {
      const res = await apiRequest('GET', '/api/friends');
      return res.json();
    } catch {
      return [];
    }
  };

  // ── Shared Recommendations ────────────────────────────────────────────────
  const saveSharedRecommendation = async (
    _userId: string | number,
    data: any,
    _options: any = {}
  ): Promise<boolean> => {
    try {
      await apiRequest('POST', '/api/shared-recommendations', data);
      return true;
    } catch {
      return false;
    }
  };

  const getSharedRecommendations = async (
    _userId: string | number,
    _options: any = {}
  ): Promise<any[]> => {
    try {
      const res = await apiRequest('GET', '/api/shared-recommendations');
      const data = await res.json();
      return Array.isArray(data) ? data : data.recommendations || [];
    } catch {
      return [];
    }
  };

  // ── Generic helpers ───────────────────────────────────────────────────────
  const getDocumentById = async <T>(
    _collection: string,
    _id: string | number,
    _options: any = {}
  ): Promise<T | null> => {
    return null;
  };

  const setDocument = async (
    _collection: string,
    _id: string | number,
    _data: any,
    _options: any = {}
  ): Promise<boolean> => {
    return true;
  };

  const updateDocument = async (
    _collection: string,
    _id: string | number,
    _data: any,
    _options: any = {}
  ): Promise<boolean> => {
    return true;
  };

  const deleteDocument = async (
    _collection: string,
    _id: string | number,
    _options: any = {}
  ): Promise<boolean> => {
    return true;
  };

  const batchWrite = async (
    _operations: any[],
    _options: any = {}
  ): Promise<boolean> => {
    return true;
  };

  return {
    error,
    getDocumentById,
    queryCollection,
    setDocument,
    updateDocument,
    deleteDocument,
    batchWrite,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    saveFilmFeedback,
    getFilmFeedback,
    saveOnboardingRating,
    saveRecommendationRating,
    getOnboardingRatings,
    saveUserPreferences,
    getUserPreferences,
    getUserData,
    updateOnboardingStatus,
    addFriend,
    updateFriendStatus,
    removeFriend,
    getFriends,
    saveSharedRecommendation,
    getSharedRecommendations,
  };
}
