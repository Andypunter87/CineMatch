import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { LogCategory, LogLevel, logFeedbackOperation } from "@/lib/firestore-test-logger";
import { formatUserPath, FirestorePaths } from "@/lib/firestore-paths";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs } from "firebase/firestore";
import { RecommendationRequest } from "@shared/schema";

/**
 * Interface for film feedback data
 */
export interface FilmFeedbackData {
  filmId: number;
  title: string;
  liked: boolean;
  timestamp: string;
  moodContext?: string | null;
  runtimePreference?: string[] | null;
  recommendationContext?: RecommendationRequest | null;
}

/**
 * Hook for saving and retrieving film feedback from Firestore
 */
export function useFilmFeedbackFirestore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<Error | null>(null);

  /**
   * Save film feedback to Firestore
   * @param userId User ID
   * @param filmId Film ID
   * @param feedbackData Feedback data
   * @param options Logging options
   * @returns Promise resolved with success status
   */
  const saveFilmFeedback = async (
    userId: string | number,
    filmId: number,
    feedbackData: FilmFeedbackData,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ) => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the feedback document
      const feedbackPath = `users/${userId}/feedback`;
      const docId = `${filmId}`;

      // Get document reference
      const docRef = doc(firestore, feedbackPath, docId);

      // Set data with merge option to preserve other fields
      await setDoc(docRef, {
        ...feedbackData,
        // Ensure timestamp is set
        timestamp: feedbackData.timestamp || new Date().toISOString(),
        // Ensure filmId is included
        filmId: filmId
      }, { merge: true });

      // Log the operation
      logFeedbackOperation(
        LogLevel.INFO,
        `Saved feedback for film ${filmId} (${feedbackData.liked ? 'like' : 'dislike'})`,
        {
          operationType: 'set',
          additionalInfo: {
            userId,
            filmId,
            liked: feedbackData.liked,
            ...options.additionalInfo
          }
        }
      );

      return true;
    } catch (error) {
      console.error("Error saving film feedback:", error);
      setError(error as Error);
      return false;
    }
  };

  /**
   * Get feedback for a specific film
   * @param userId User ID
   * @param filmId Film ID
   * @param options Logging options
   * @returns Promise resolved with feedback data or null
   */
  const getFilmFeedback = async (
    userId: string | number,
    filmId: number,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<FilmFeedbackData | null> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the feedback document
      const feedbackPath = `users/${userId}/feedback`;
      const docId = `${filmId}`;

      // Get document reference
      const docRef = doc(firestore, feedbackPath, docId);

      // Get document
      const docSnapshot = await getDoc(docRef);

      // Log the operation
      logFeedbackOperation(
        LogLevel.INFO,
        `Retrieved feedback for film ${filmId}`,
        {
          operationType: 'get',
          additionalInfo: {
            userId,
            filmId,
            exists: docSnapshot.exists(),
            ...options.additionalInfo
          }
        }
      );

      // Return data if it exists
      if (docSnapshot.exists()) {
        return docSnapshot.data() as FilmFeedbackData;
      }

      return null;
    } catch (error) {
      console.error("Error getting film feedback:", error);
      setError(error as Error);
      return null;
    }
  };

  /**
   * Get all feedback for a user
   * @param userId User ID
   * @param options Logging options
   * @returns Promise resolved with array of feedback data
   */
  const getAllFilmFeedback = async (
    userId: string | number,
    options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<FilmFeedbackData[]> => {
    try {
      // Get Firestore
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }

      // Create path to the feedback collection
      const feedbackPath = `users/${userId}/feedback`;

      // Get collection reference
      const collectionRef = collection(firestore, feedbackPath);

      // Get documents
      const snapshot = await getDocs(collectionRef);

      // Log the operation
      logFeedbackOperation(
        LogLevel.INFO,
        `Retrieved all feedback for user ${userId}`,
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
        return snapshot.docs.map((document: any) => document.data() as FilmFeedbackData);
      }

      return [];
    } catch (error) {
      console.error("Error getting all film feedback:", error);
      setError(error as Error);
      return [];
    }
  };

  return {
    saveFilmFeedback,
    getFilmFeedback,
    getAllFilmFeedback,
    error
  };
}