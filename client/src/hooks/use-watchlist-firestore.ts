import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LogCategory, LogLevel, logWatchlistOperation } from "@/lib/firestore-test-logger";
import { formatUserPath, FirestorePaths } from "@/lib/firestore-paths";
import { useFirestoreUtils } from "@/lib/firestore-direct";
import { RecommendationRequest } from "@shared/schema";

/**
 * Interface for watchlist item data
 */
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

/**
 * Hook for managing watchlist items in Firestore
 */
export function useWatchlistFirestore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getFirestore, getDocRef } = useFirestoreUtils();
  const [error, setError] = useState<Error | null>(null);

  /**
   * Add a film to the user's watchlist in Firestore
   * @param userId User ID
   * @param filmId Film ID
   * @param filmData Film data
   * @param options Logging options
   * @returns Promise resolved with success status
   */
  const addToWatchlist = async (
    userId: string | number,
    filmId: number,
    filmData: {
      title: string;
      year?: number;
      genres?: string[];
      posterUrl?: string;
      source?: string;
      recommendationContext?: RecommendationRequest;
    },
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the watchlist document
      const watchlistPath = formatUserPath(userId, "watchlist");
      const docId = String(filmId);

      // Get document reference
      const docRef = firestore.collection(watchlistPath).doc(docId);

      // Create watchlist item data
      const watchlistItem: WatchlistItemData = {
        filmId,
        title: filmData.title,
        year: filmData.year,
        genres: filmData.genres,
        posterUrl: filmData.posterUrl,
        timestamp: new Date().toISOString(),
        source: filmData.source || "recommendation",
        watched: false,
        recommendationContext: filmData.recommendationContext
      };

      // Set data with merge option to preserve other fields
      await docRef.set(watchlistItem, { merge: true });

      // Log the operation
      logWatchlistOperation(
        LogLevel.INFO,
        `Added film ${filmId} (${filmData.title}) to watchlist`,
        {
          operationType: 'set',
          additionalInfo: {
            userId,
            filmId,
            title: filmData.title,
            ...options.additionalInfo
          }
        }
      );

      return true;
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      setError(error as Error);
      return false;
    }
  };

  /**
   * Remove a film from the user's watchlist in Firestore
   * @param userId User ID
   * @param filmId Film ID
   * @param options Logging options
   * @returns Promise resolved with success status
   */
  const removeFromWatchlist = async (
    userId: string | number,
    filmId: number,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the watchlist document
      const watchlistPath = formatUserPath(userId, "watchlist");
      const docId = String(filmId);

      // Get document reference
      const docRef = firestore.collection(watchlistPath).doc(docId);

      // Delete document
      await docRef.delete();

      // Log the operation
      logWatchlistOperation(
        LogLevel.INFO,
        `Removed film ${filmId} from watchlist`,
        {
          operationType: 'delete',
          additionalInfo: {
            userId,
            filmId,
            ...options.additionalInfo
          }
        }
      );

      return true;
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      setError(error as Error);
      return false;
    }
  };

  /**
   * Get all items in the user's watchlist from Firestore
   * @param userId User ID
   * @param options Logging options
   * @returns Promise resolved with array of watchlist items
   */
  const getWatchlist = async (
    userId: string | number,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<WatchlistItemData[]> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the watchlist collection
      const watchlistPath = formatUserPath(userId, "watchlist");

      // Get collection reference
      const collectionRef = firestore.collection(watchlistPath);

      // Get documents ordered by timestamp (newest first)
      const snapshot = await collectionRef.orderBy("timestamp", "desc").get();

      // Log the operation
      logWatchlistOperation(
        LogLevel.INFO,
        `Retrieved watchlist for user ${userId}`,
        {
          operationType: 'query',
          additionalInfo: {
            userId,
            count: snapshot.size,
            ...options.additionalInfo
          }
        }
      );

      // Return data if it exists
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data() as WatchlistItemData);
      }

      return [];
    } catch (error) {
      console.error("Error getting watchlist:", error);
      setError(error as Error);
      return [];
    }
  };

  /**
   * Update a watchlist item in Firestore
   * @param userId User ID
   * @param filmId Film ID
   * @param updates Fields to update
   * @param options Logging options
   * @returns Promise resolved with success status
   */
  const updateWatchlistItem = async (
    userId: string | number,
    filmId: number,
    updates: Partial<WatchlistItemData>,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the watchlist document
      const watchlistPath = formatUserPath(userId, "watchlist");
      const docId = String(filmId);

      // Get document reference
      const docRef = firestore.collection(watchlistPath).doc(docId);

      // Update document
      await docRef.update(updates);

      // Log the operation
      logWatchlistOperation(
        LogLevel.INFO,
        `Updated watchlist item for film ${filmId}`,
        {
          operationType: 'update',
          additionalInfo: {
            userId,
            filmId,
            updates,
            ...options.additionalInfo
          }
        }
      );

      return true;
    } catch (error) {
      console.error("Error updating watchlist item:", error);
      setError(error as Error);
      return false;
    }
  };

  /**
   * Check if a film is in the user's watchlist
   * @param userId User ID
   * @param filmId Film ID
   * @param options Logging options
   * @returns Promise resolved with boolean indicating if the film is in the watchlist
   */
  const isInWatchlist = async (
    userId: string | number,
    filmId: number,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the watchlist document
      const watchlistPath = formatUserPath(userId, "watchlist");
      const docId = String(filmId);

      // Get document reference
      const docRef = firestore.collection(watchlistPath).doc(docId);

      // Get document
      const docSnapshot = await docRef.get();

      // Log the operation
      logWatchlistOperation(
        LogLevel.INFO,
        `Checked if film ${filmId} is in watchlist`,
        {
          operationType: 'get',
          additionalInfo: {
            userId,
            filmId,
            exists: docSnapshot.exists,
            ...options.additionalInfo
          }
        }
      );

      return docSnapshot.exists;
    } catch (error) {
      console.error("Error checking if film is in watchlist:", error);
      setError(error as Error);
      return false;
    }
  };

  return {
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    updateWatchlistItem,
    isInWatchlist,
    error
  };
}