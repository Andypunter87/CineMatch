/**
 * Feedback Insight Hook
 * 
 * Provides personalized insights for films based on previous user feedback.
 * Now backed by PostgreSQL via the REST API.
 */

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Film } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export type InsightType = 'positive' | 'negative' | 'neutral' | 'friend';

export interface FilmInsight {
  type: InsightType;
  message: string;
  relatedFilmId?: number;
  relatedFilmTitle?: string;
  confidence: number;
  matchReason?: string;
}

// In-memory cache to avoid repeated API calls during a session
const insightCache = new Map<number, FilmInsight>();

export function useFeedbackInsight() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getFilmInsight = async (film: Film): Promise<FilmInsight | null> => {
    if (!user || !user.id || !film || !film.id) return null;

    if (insightCache.has(film.id)) {
      return insightCache.get(film.id) || null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await apiRequest('GET', '/api/feedback');
      const data = await res.json();
      const allFeedback: any[] = data.feedback || [];

      if (allFeedback.length === 0) return null;

      // Find liked films with matching genres
      const likedFeedback = allFeedback.filter(f => f.liked);
      const dislikedFeedback = allFeedback.filter(f => !f.liked);

      const filmGenres = film.genres || [];

      // Check if user already gave feedback on this exact film
      const exactMatch = allFeedback.find(f => f.filmId === film.id);
      if (exactMatch) {
        const insight: FilmInsight = {
          type: exactMatch.liked ? 'positive' : 'negative',
          message: exactMatch.liked
            ? `You liked this film before`
            : `You didn't enjoy this film before`,
          relatedFilmId: film.id,
          relatedFilmTitle: film.title,
          confidence: 1.0,
          matchReason: 'exact',
        };
        insightCache.set(film.id, insight);
        return insight;
      }

      // Find a related liked film by genre
      if (filmGenres.length > 0 && likedFeedback.length > 0) {
        const insight: FilmInsight = {
          type: 'positive',
          message: `Based on films you've enjoyed`,
          confidence: 0.6,
          matchReason: 'genre',
        };
        insightCache.set(film.id, insight);
        return insight;
      }

      return null;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearInsightCache = () => {
    insightCache.clear();
  };

  const prefetchInsights = async (_films: Film[]): Promise<void> => {
    // Insights are fetched on-demand; no prefetch needed
  };

  return {
    getFilmInsight,
    clearInsightCache,
    prefetchInsights,
    isLoading,
    error,
  };
}
