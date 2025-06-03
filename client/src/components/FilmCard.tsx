/**
 * FilmCard Component
 * 
 * A simplified film card component that combines film information display
 * with user interaction capabilities. This component has been refactored
 * to separate concerns and improve maintainability.
 */

import { useState, useEffect } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useFeedbackInsight, FilmInsight } from "@/hooks/use-feedback-insight";
import { useEnhancedInsights, EnhancedFilmInsight } from "@/hooks/use-enhanced-insights";
import FilmInfo from "./FilmInfo";
import FilmActionButtons from "./FilmActionButtons";

// Extend the RecommendationRequest type to include isOnboarding flag
interface OnboardingAwareRecommendationContext extends RecommendationRequest {
  isOnboarding?: boolean;
}

interface FilmCardProps {
  film: Film;
  recommendationContext?: OnboardingAwareRecommendationContext;
  onDisliked?: (filmId: number) => void;
}

export default function FilmCard({ film, recommendationContext, onDisliked }: FilmCardProps) {
  const { user } = useAuth();
  
  // State management
  const [insight, setInsight] = useState<FilmInsight | null>(null);
  const [enhancedInsight, setEnhancedInsight] = useState<EnhancedFilmInsight | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState<boolean>(false);
  
  // Hooks for insights
  const { getFilmInsight } = useFeedbackInsight();
  const { getInsightForFilm, hasPreferenceData } = useEnhancedInsights();
  
  // Watchlist data query
  const { data: watchlistItems = [] } = useQuery<any[]>({
    queryKey: ['/api/watchlist'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  
  // Check if film is in watchlist
  useEffect(() => {
    if (!watchlistItems || !Array.isArray(watchlistItems)) return;
    
    const inWatchlist = watchlistItems.some(
      (item: any) => item && 
        item.filmId === film.id && 
        item.filmTitle.toLowerCase() === film.title.toLowerCase()
    );
    
    setIsWatchlisted(inWatchlist);
  }, [watchlistItems, film.id, film.title]);

  // Load insight data
  useEffect(() => {
    if (user && film) {
      getFilmInsight(film).then(result => {
        if (result) {
          setInsight(result);
        }
      }).catch(error => {
        console.error("Error loading film insight:", error);
      });
    }
  }, [film, user, getFilmInsight]);

  // Load enhanced insights
  useEffect(() => {
    if (user && film && hasPreferenceData) {
      getInsightForFilm(film).then(result => {
        if (result) {
          setEnhancedInsight(result);
        }
      }).catch(error => {
        console.error("Error loading enhanced insight:", error);
      });
    }
  }, [film, user, hasPreferenceData, getInsightForFilm]);

  const handleWatchlistChange = (newIsWatchlisted: boolean) => {
    setIsWatchlisted(newIsWatchlisted);
  };

  return (
    <div className="space-y-4">
      <FilmInfo 
        film={film} 
        insight={insight} 
        enhancedInsight={enhancedInsight} 
      />
      <FilmActionButtons
        film={film}
        isWatchlisted={isWatchlisted}
        recommendationContext={recommendationContext}
        onWatchlistChange={handleWatchlistChange}
        onDisliked={onDisliked}
      />
    </div>
  );
}