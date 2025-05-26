/**
 * Enhanced Film Insights Hook
 * 
 * This hook integrates with the new enhanced recommendation system
 * to provide better "Because you liked X" badges using the weighted
 * preference system and multiple data sources.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Film } from "@shared/schema";

export interface EnhancedFilmInsight {
  type: 'liked_film' | 'similar_preference' | 'collaborative';
  reason: string;
  confidence: number;
  sourceFilm?: {
    title: string;
    id: number;
  };
}

export interface EnhancedInsightResult {
  [filmId: number]: EnhancedFilmInsight | null;
}

/**
 * Hook to get enhanced film insights using the new recommendation system
 */
export function useEnhancedInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<EnhancedInsightResult>({});

  // Get user's preference profile from enhanced API
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/enhanced/user-profile/${user?.id}`],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  });

  // Get top recommendations to understand user's strong preferences
  const { data: topRecommendations, isLoading: topLoading } = useQuery({
    queryKey: [`/api/enhanced/top-recommendations/${user?.id}`],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  /**
   * Generate insights for a list of films using enhanced preference data
   */
  const getInsightsForFilms = async (films: Film[]): Promise<EnhancedInsightResult> => {
    if (!user || !userProfile?.profile || !topRecommendations?.recommendations) {
      return {};
    }

    const newInsights: EnhancedInsightResult = {};
    const userPrefs = userProfile.profile;
    const topRatedFilms = topRecommendations.recommendations;

    console.log('Generating enhanced insights for films using preference profile');

    films.forEach(film => {
      if (!film.id) return;

      // Check if this film has a preference score
      const preferenceScore = userPrefs[film.id.toString()];
      
      if (preferenceScore && preferenceScore > 1.0) {
        // High preference score indicates strong positive signals
        newInsights[film.id] = {
          type: 'similar_preference',
          reason: 'Based on your viewing preferences',
          confidence: Math.min(preferenceScore / 2.0, 1.0), // Normalize to 0-1
        };
        return;
      }

      // Look for similar films in top rated list
      const similarFilm = topRatedFilms.find(topFilm => {
        if (!film.genres || !topFilm.genres) return false;
        
        // Check for genre overlap
        const filmGenres = film.genres;
        const topFilmGenres = topFilm.genres;
        
        const overlap = filmGenres.filter(genre => 
          topFilmGenres.includes(genre)
        ).length;
        
        return overlap >= 2; // Require at least 2 matching genres
      });

      if (similarFilm) {
        newInsights[film.id] = {
          type: 'liked_film',
          reason: `Because you liked "${similarFilm.title}"`,
          confidence: 0.8,
          sourceFilm: {
            title: similarFilm.title,
            id: similarFilm.id
          }
        };
      }
    });

    console.log(`Generated ${Object.keys(newInsights).length} enhanced insights`);
    return newInsights;
  };

  /**
   * Get insight for a single film
   */
  const getInsightForFilm = async (film: Film): Promise<EnhancedFilmInsight | null> => {
    const insights = await getInsightsForFilms([film]);
    return insights[film.id] || null;
  };

  /**
   * Update insights when new films are provided
   */
  const updateInsightsForFilms = async (films: Film[]) => {
    if (!films.length || profileLoading || topLoading) return;

    try {
      const newInsights = await getInsightsForFilms(films);
      setInsights(prev => ({ ...prev, ...newInsights }));
    } catch (error) {
      console.error('Error generating enhanced insights:', error);
    }
  };

  return {
    insights,
    getInsightForFilm,
    updateInsightsForFilms,
    isLoading: profileLoading || topLoading,
    hasPreferenceData: !!userProfile?.profile && Object.keys(userProfile.profile).length > 0
  };
}

/**
 * Hook specifically for getting collaborative session insights
 */
export function useCollaborativeInsights(friendUserId?: string) {
  const { user } = useAuth();
  
  // Get blended session profile for collaborative viewing
  const { data: blendedProfile, isLoading } = useQuery({
    queryKey: [`/api/enhanced/session-profile/${user?.id}/${friendUserId}`],
    enabled: !!user?.id && !!friendUserId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1
  });

  /**
   * Generate collaborative insights based on blended preferences
   */
  const getCollaborativeInsights = async (films: Film[]): Promise<EnhancedInsightResult> => {
    if (!blendedProfile?.blendedProfile) return {};

    const insights: EnhancedInsightResult = {};
    const blendedPrefs = blendedProfile.blendedProfile;

    films.forEach(film => {
      if (!film.id) return;

      const blendedScore = blendedPrefs[film.id.toString()];
      
      if (blendedScore && blendedScore > 0.5) {
        insights[film.id] = {
          type: 'collaborative',
          reason: 'Perfect for watching together',
          confidence: Math.min(blendedScore, 1.0)
        };
      }
    });

    return insights;
  };

  return {
    getCollaborativeInsights,
    isLoading,
    hasBlendedData: !!blendedProfile?.blendedProfile
  };
}