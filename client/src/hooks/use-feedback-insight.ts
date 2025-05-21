/**
 * Feedback Insight Hook
 * 
 * This hook provides personalized insights for films based on previous user feedback.
 * It helps to create "Because you liked..." and similar nudges in the UI.
 */

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Film } from "@shared/schema";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy 
} from "firebase/firestore";

// Types for the feedback insight functionality
export type InsightType = 'positive' | 'negative' | 'neutral' | 'friend';

export interface FilmInsight {
  type: InsightType;
  message: string;
  relatedFilmId?: number;
  relatedFilmTitle?: string;
  confidence: number; // 0-1 rating of how confident we are in this insight
  matchReason?: string; // Why this insight was selected: 'genre', 'mood', etc.
}

// Cache for film insights to reduce Firestore reads
const insightCache = new Map<number, FilmInsight>();

/**
 * Hook to get personalized insights about films based on previous feedback
 */
export function useFeedbackInsight() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Get insight for a specific film
   * 
   * @param film The film to get insights for
   * @returns Promise with insight data or null if none found
   */
  const getFilmInsight = async (film: Film): Promise<FilmInsight | null> => {
    if (!user || !user.id || !film || !film.id) return null;
    
    // Return cached insight if available
    if (insightCache.has(film.id)) {
      return insightCache.get(film.id) || null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const firestore = getFirestore();
      if (!firestore) {
        console.warn("Firestore not initialized, skipping insights");
        return null;
      }
      
      // Check if the user has any previous feedback that might be relevant
      const feedbackInsight = await findRelevantFeedback(film);
      
      // Cache the result (even if null)
      if (feedbackInsight) {
        insightCache.set(film.id, feedbackInsight);
      }
      
      return feedbackInsight;
    } catch (error) {
      console.error("Error getting film insight:", error);
      setError(error as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Find relevant feedback for a film, prioritizing similarity in genres and mood
   * 
   * @param film The film to find similar films for
   * @returns Promise with the best matching insight or null
   */
  const findRelevantFeedback = async (film: Film): Promise<FilmInsight | null> => {
    if (!user || !user.id) {
      return null;
    }
    
    try {
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }
      
      // Path to user's feedback collection
      const feedbackPath = `users/${user.id}/feedback`;
      
      console.log(`Looking for feedback insights in Firestore at: ${feedbackPath}`);
      
      // Get recent feedback documents, limited to 30 documents to ensure we find matches
      // We'll filter for liked=true in memory to avoid composite index requirements
      // Using orderBy("timestamp", "desc") to get most recent feedback
      const feedbackRef = query(
        collection(firestore, feedbackPath),
        orderBy("timestamp", "desc"),
        limit(30)
      );
      
      const feedbackSnap = await getDocs(feedbackRef);
      
      if (feedbackSnap.empty) {
        return null;
      }
      
      // Array to collect potential insights
      const insights: FilmInsight[] = [];
      
      // Process each feedback document
      console.log(`Processing ${feedbackSnap.size} feedback documents for insight generation`);
      
      feedbackSnap.forEach(doc => {
        const feedbackData = doc.data();
        
        // Skip if this is the same film or not a positive feedback
        if (feedbackData.filmId === film.id || feedbackData.liked !== true) {
          return;
        }
        
        console.log(`Found liked film for insight: "${feedbackData.title}" (ID: ${feedbackData.filmId})`);
        
        
        // Default confidence and match reason
        let confidence = 0.5;
        let matchReason = 'liked';
        
        // Check for genre match if we have genre data
        if (film.genres && film.genres.length > 0 && feedbackData.genres && feedbackData.genres.length > 0) {
          // Find overlapping genres
          const filmGenres = film.genres;
          const feedbackGenres = feedbackData.genres;
          
          // Check for any genre overlap
          const overlappingGenres = feedbackGenres.filter((genre: string) => 
            typeof genre === 'string' && filmGenres.includes(genre)
          );
          
          if (overlappingGenres.length > 0) {
            // Boost confidence based on genre matches
            confidence = Math.min(
              0.9, // Cap at 0.9
              0.5 + (0.1 * overlappingGenres.length) // Base 0.5 + 0.1 per match
            );
            matchReason = 'genre';
          }
        }
        
        // Check if we have mood data in the feedback
        if (feedbackData.moodContext) {
          // If the film has a matchReason containing "mood", it's likely a mood-based match
          if (film.matchReason?.includes('mood')) {
            confidence = Math.max(confidence, 0.8);
            matchReason = 'mood';
          }
        }
        
        // Create insight with appropriate confidence level
        insights.push({
          type: 'positive',
          message: `Because you liked ${feedbackData.title}`,
          relatedFilmId: feedbackData.filmId,
          relatedFilmTitle: feedbackData.title,
          confidence,
          matchReason
        });
      });
      
      // Sort by confidence and return the best match
      if (insights.length > 0) {
        insights.sort((a, b) => b.confidence - a.confidence);
        return insights[0];
      }
      
      return null;
    } catch (error) {
      console.error("Error finding relevant feedback:", error);
      return null;
    }
  };
  
  /**
   * Get personalized insight messages for multiple films
   * Optimized to batch process films and minimize Firestore reads
   * 
   * @param films Array of films to get insights for
   * @returns Map of film IDs to insight messages
   */
  const getFilmInsightsForList = async (films: Film[]): Promise<Map<number, FilmInsight>> => {
    if (!user || !user.id || films.length === 0) {
      return new Map();
    }
    
    try {
      // Check cache first for all films
      const resultMap = new Map<number, FilmInsight>();
      const uncachedFilms: Film[] = [];
      
      // Get any cached insights first
      films.forEach(film => {
        if (film.id && insightCache.has(film.id)) {
          const cachedInsight = insightCache.get(film.id);
          if (cachedInsight) {
            resultMap.set(film.id, cachedInsight);
          }
        } else {
          uncachedFilms.push(film);
        }
      });
      
      // If all films were cached, return the result
      if (uncachedFilms.length === 0) {
        return resultMap;
      }
      
      // Otherwise, fetch insights for uncached films
      const firestore = getFirestore();
      if (!firestore) {
        return resultMap; // Return what we have from cache
      }
      
      // Get recent feedback entries and filter for liked=true in memory to avoid composite index requirements
      const feedbackPath = `users/${user.id}/feedback`;
      const feedbackRef = query(
        collection(firestore, feedbackPath),
        orderBy("timestamp", "desc"),
        limit(30)
      );
      
      const feedbackSnap = await getDocs(feedbackRef);
      
      if (feedbackSnap.empty) {
        return resultMap; // Return what we have from cache
      }
      
      // Build a map of all user's liked films - filtering for liked=true in memory
      const likedFilms: {
        id: number;
        title: string;
        genres?: string[];
        mood?: string;
        timestamp?: string;
      }[] = [];
      
      // Log feedback data we retrieved for debugging
      console.log(`Retrieved ${feedbackSnap.size} feedback items from Firestore, now filtering for liked=true`);
      
      feedbackSnap.forEach(doc => {
        const data = doc.data();
        // Filter for liked=true in memory to avoid composite index requirements
        if (data.liked === true) {
          likedFilms.push({
            id: data.filmId,
            title: data.title,
            genres: data.genres || [],
            mood: data.moodContext,
            timestamp: data.timestamp
          });
          console.log(`Found liked film: "${data.title}" (ID: ${data.filmId})`);
        }
      });
      
      console.log(`After filtering, found ${likedFilms.length} liked films for badge generation`);
      
      // Process each uncached film to find the best insight
      uncachedFilms.forEach(film => {
        if (!film.id) return; // Skip films without ID
        
        let bestInsight: FilmInsight | null = null;
        let bestConfidence = 0;
        
        // Check each liked film for similarity
        for (const likedFilm of likedFilms) {
          // Skip if this is the same film
          if (likedFilm.id === film.id) continue;
          
          // Default confidence and match reason
          let confidence = 0.5;
          let matchReason = 'liked';
          
          // Check for genre match
          if (film.genres && film.genres.length > 0 && likedFilm.genres && likedFilm.genres.length > 0) {
            const overlappingGenres = likedFilm.genres.filter(genre => 
              typeof genre === 'string' && film.genres.includes(genre)
            );
            
            if (overlappingGenres.length > 0) {
              // Boost confidence based on genre matches
              confidence = Math.min(
                0.9, // Cap at 0.9
                0.5 + (0.1 * overlappingGenres.length) // Base 0.5 + 0.1 per match
              );
              matchReason = 'genre';
            }
          }
          
          // Check if we have mood data in the liked film and a match reason in the current film
          if (likedFilm.mood && film.matchReason?.includes('mood')) {
            // Mood match is highly relevant
            confidence = Math.max(confidence, 0.8);
            matchReason = 'mood';
          }
          
          // Update best match if this is better
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestInsight = {
              type: 'positive',
              message: `Because you liked ${likedFilm.title}`,
              relatedFilmId: likedFilm.id,
              relatedFilmTitle: likedFilm.title,
              confidence,
              matchReason
            };
          }
        }
        
        // Store the best insight for this film if found
        if (bestInsight) {
          resultMap.set(film.id, bestInsight);
          // Update cache
          insightCache.set(film.id, bestInsight);
        }
      });
      
      return resultMap;
    } catch (error) {
      console.error("Error getting film insights for list:", error);
      return new Map();
    }
  };

  return {
    getFilmInsight,
    getFilmInsightsForList,
    isLoading,
    error
  };
}