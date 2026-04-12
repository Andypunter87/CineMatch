import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { RecommendationRequest } from "@shared/schema";

export interface WatchlistItemData {
  filmId: number;
  title: string;
  year?: number;
  genres?: string[];
  posterUrl?: string;
  timestamp: string;
  source?: string;
  watched?: boolean;
  dateWatched?: string;
  userRating?: number;
  userNotes?: string;
  recommendationContext?: RecommendationRequest;
}

export function useWatchlistFirestore() {
  const { user } = useAuth();
  const [error, setError] = useState<Error | null>(null);

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
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
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
      console.error("Error adding to watchlist:", err);
      setError(err as Error);
      return false;
    }
  };

  const removeFromWatchlist = async (
    _userId: string | number,
    filmId: number,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      await apiRequest('DELETE', `/api/watchlist/${filmId}`);
      return true;
    } catch (err) {
      console.error("Error removing from watchlist:", err);
      setError(err as Error);
      return false;
    }
  };

  const getWatchlist = async (
    _userId: string | number,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<WatchlistItemData[]> => {
    if (!user) return [];
    try {
      const res = await apiRequest('GET', '/api/watchlist');
      const data = await res.json();
      return (data || []).map((item: any) => ({
        filmId: item.filmId,
        title: item.filmTitle,
        year: item.filmYear,
        genres: item.filmGenres,
        posterUrl: item.filmPosterUrl,
        timestamp: item.dateAdded || new Date().toISOString(),
        source: item.filmType,
        watched: item.watched,
        dateWatched: item.dateWatched,
        userRating: item.userRating,
        userNotes: item.userNotes,
        recommendationContext: item.recommendationContext,
      }));
    } catch (err) {
      console.error("Error getting watchlist:", err);
      setError(err as Error);
      return [];
    }
  };

  const updateWatchlistItem = async (
    _userId: string | number,
    filmId: number,
    updates: Partial<WatchlistItemData>,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      await apiRequest('PUT', `/api/watchlist/${filmId}`, {
        watched: updates.watched,
        userRating: updates.userRating,
        userNotes: updates.userNotes,
        dateWatched: updates.dateWatched,
      });
      return true;
    } catch (err) {
      console.error("Error updating watchlist item:", err);
      setError(err as Error);
      return false;
    }
  };

  const isInWatchlist = async (
    _userId: string | number,
    filmId: number,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await apiRequest('GET', '/api/watchlist');
      const data = await res.json();
      return (data || []).some((item: any) => item.filmId === filmId);
    } catch (err) {
      console.error("Error checking watchlist:", err);
      setError(err as Error);
      return false;
    }
  };

  return {
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    updateWatchlistItem,
    isInWatchlist,
    error,
  };
}
