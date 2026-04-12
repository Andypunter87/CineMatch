import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { RecommendationRequest } from "@shared/schema";

export interface WatchlistItemData {
  id?: number;
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
    _options: { logCategory?: string; additionalInfo?: Record<string, unknown> } = {}
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
    _options: { logCategory?: string; additionalInfo?: Record<string, unknown> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const watchlistItems = await getWatchlist(_userId);
      const item = watchlistItems.find((i) => i.filmId === filmId);
      if (!item?.id) {
        console.warn(`Watchlist item with filmId ${filmId} not found`);
        return false;
      }
      await apiRequest('DELETE', `/api/watchlist/${item.id}`);
      return true;
    } catch (err) {
      console.error("Error removing from watchlist:", err);
      setError(err as Error);
      return false;
    }
  };

  const getWatchlist = async (
    _userId: string | number,
    _options: { logCategory?: string; additionalInfo?: Record<string, unknown> } = {}
  ): Promise<WatchlistItemData[]> => {
    if (!user) return [];
    try {
      const res = await apiRequest('GET', '/api/watchlist');
      const data = await res.json();
      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as number,
        filmId: item.filmId as number,
        title: item.filmTitle as string,
        year: item.filmYear as number | undefined,
        genres: item.filmGenres as string[] | undefined,
        posterUrl: item.filmPosterUrl as string | undefined,
        timestamp: (item.dateAdded as string) || new Date().toISOString(),
        source: item.filmType as string | undefined,
        watched: item.watched as boolean | undefined,
        dateWatched: item.dateWatched as string | undefined,
        userRating: item.userRating as number | undefined,
        userNotes: item.userNotes as string | undefined,
        recommendationContext: item.recommendationContext as RecommendationRequest | undefined,
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
    _options: { logCategory?: string; additionalInfo?: Record<string, unknown> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const watchlistItems = await getWatchlist(_userId);
      const item = watchlistItems.find((i) => i.filmId === filmId);
      if (!item?.id) {
        console.warn(`Watchlist item with filmId ${filmId} not found for update`);
        return false;
      }
      await apiRequest('PUT', `/api/watchlist/${item.id}`, {
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
    _options: { logCategory?: string; additionalInfo?: Record<string, unknown> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const items = await getWatchlist(_userId);
      return items.some((item) => item.filmId === filmId);
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
