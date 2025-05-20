/**
 * Feedback Insight Hook
 * 
 * This hook provides personalized insights for films based on previous user feedback.
 * It helps to create "Because you liked..." and similar nudges in the UI.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Film } from "@shared/schema";
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";
import { formatUserPath } from "@/lib/firestore-paths";

// Types for the feedback insight functionality
export type InsightType = 'positive' | 'negative' | 'neutral' | 'friend';

export interface FilmInsight {
  type: InsightType;
  message: string;
  relatedFilmId?: number;
  relatedFilmTitle?: string;
  confidence: number; // 0-1 rating of how confident we are in this insight
}

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
    if (!user || !user.id) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }
      
      // Check if the user has previous feedback for similar films
      // First, check by genre similarity
      const genreMatches = await findSimilarFilmsByGenre(film);
      
      if (genreMatches && genreMatches.length > 0) {
        // Find the best match (highest confidence)
        const bestMatch = genreMatches.reduce((best, current) => 
          current.confidence > best.confidence ? current : best, 
          genreMatches[0]
        );
        
        return bestMatch;
      }
      
      // If no match by genre, try to find matches by other criteria
      // This could be expanded with more sophisticated matching in the future
      
      return null;
    } catch (error) {
      console.error("Error getting film insight:", error);
      setError(error as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Find similar films by genre in the user's feedback history
   * 
   * @param film The film to find similar films for
   * @returns Promise with array of insights
   */
  const findSimilarFilmsByGenre = async (film: Film): Promise<FilmInsight[]> => {
    if (!user || !user.id || !film.genres || film.genres.length === 0) {
      return [];
    }
    
    try {
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }
      
      // Path to user's feedback collection
      const feedbackPath = formatUserPath(user.id, "feedback/films");
      
      // Get all feedback for this user
      const feedbackRef = collection(firestore, feedbackPath);
      const feedbackSnap = await getDocs(feedbackRef);
      
      if (feedbackSnap.empty) {
        return [];
      }
      
      const insights: FilmInsight[] = [];
      
      // Process each feedback document
      feedbackSnap.forEach(doc => {
        const feedbackData = doc.data();
        
        // Skip if this is the same film
        if (feedbackData.filmId === film.id) {
          return;
        }
        
        // If the user liked this film
        if (feedbackData.liked && feedbackData.genres) {
          // Check for genre overlap
          const feedbackGenres = Array.isArray(feedbackData.genres) 
            ? feedbackData.genres 
            : [];
            
          const currentFilmGenres = film.genres || [];
          
          // Find overlapping genres
          const overlappingGenres = feedbackGenres.filter(genre => 
            currentFilmGenres.includes(genre)
          );
          
          if (overlappingGenres.length > 0) {
            // Calculate confidence based on how many genres overlap
            const confidence = Math.min(
              1, 
              overlappingGenres.length / Math.max(1, currentFilmGenres.length)
            );
            
            // Only include if we have decent confidence
            if (confidence >= 0.3) {
              insights.push({
                type: 'positive',
                message: `Because you liked ${feedbackData.title}`,
                relatedFilmId: feedbackData.filmId,
                relatedFilmTitle: feedbackData.title,
                confidence
              });
            }
          }
        }
        
        // We could also add negative insights for disliked films
        // For now we focus just on positive recommendations
      });
      
      // Return sorted by confidence (highest first)
      return insights.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error("Error finding similar films by genre:", error);
      return [];
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
      const firestore = getFirestore();
      if (!firestore) {
        throw new Error("Firestore not initialized");
      }
      
      // Path to user's feedback collection
      const feedbackPath = formatUserPath(user.id, "feedback/films");
      
      // Get all feedback for this user
      const feedbackRef = collection(firestore, feedbackPath);
      const feedbackSnap = await getDocs(feedbackRef);
      
      if (feedbackSnap.empty) {
        return new Map();
      }
      
      // Build a map of all user's liked films with their genres
      const likedFilms = new Map();
      feedbackSnap.forEach(doc => {
        const data = doc.data();
        if (data.liked) {
          likedFilms.set(data.filmId, {
            title: data.title,
            genres: data.genres || []
          });
        }
      });
      
      // Map to store results
      const insightMap = new Map<number, FilmInsight>();
      
      // Process each film to find the best insight
      films.forEach(film => {
        const filmGenres = film.genres || [];
        let bestInsight: FilmInsight | null = null;
        let bestConfidence = 0;
        
        // Check each liked film for similarity
        likedFilms.forEach((likedFilm, likedFilmId) => {
          // Skip if this is the same film
          if (likedFilmId === film.id) return;
          
          const likedGenres = likedFilm.genres || [];
          
          // Find overlapping genres
          const overlappingGenres = likedGenres.filter((genre: string) => 
            filmGenres.includes(genre)
          );
          
          if (overlappingGenres.length > 0) {
            // Calculate confidence based on how many genres overlap
            const confidence = Math.min(
              1, 
              overlappingGenres.length / Math.max(1, filmGenres.length)
            );
            
            // Only include if we have decent confidence and it's better than existing
            if (confidence >= 0.3 && confidence > bestConfidence) {
              bestConfidence = confidence;
              bestInsight = {
                type: 'positive',
                message: `Because you liked ${likedFilm.title}`,
                relatedFilmId: likedFilmId,
                relatedFilmTitle: likedFilm.title,
                confidence
              };
            }
          }
        });
        
        // Store the best insight for this film if found
        if (bestInsight) {
          insightMap.set(film.id, bestInsight);
        }
      });
      
      return insightMap;
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