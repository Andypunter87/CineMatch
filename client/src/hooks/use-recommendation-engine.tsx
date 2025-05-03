import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences } from "@/hooks/use-preferences";
import { useFilmRating } from "@/hooks/use-film-rating";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { useRecommendationHistory } from "@/hooks/use-recommendation-history";

const PREFERENCES_STORAGE_KEY = "cinematch_preferences";

/**
 * A comprehensive hook that manages film recommendations by integrating:
 * - User preferences from Firestore
 * - User ratings from Firestore
 * - Recommendation history
 * - Local preferences storage as fallback
 */
export function useRecommendationEngine() {
  const { user } = useAuth();
  const {
    recommendations: historyRecommendations,
    preferences: historyPreferences,
    hasHistory
  } = useRecommendationHistory();
  
  // Get user preferences and film ratings
  const preferences = usePreferences(false); // use in regular mode, not onboarding
  const filmRating = useFilmRating(false); // use in regular mode, not onboarding
  
  // State for managing films seen in the current session
  const [seenFilmIds, setSeenFilmIds] = useState<number[]>([]);
  
  // Track the initial batch size for consistent "Show More" behavior
  const [initialBatchSize, setInitialBatchSize] = useState<number>(0);
  
  // Keep track of film IDs that received negative feedback
  const [dislikedFilmIds, setDislikedFilmIds] = useState<number[]>(() => {
    // Try to load disliked film IDs from localStorage
    const savedDislikedFilms = localStorage.getItem('dislikedFilmIds');
    if (savedDislikedFilms) {
      try {
        return JSON.parse(savedDislikedFilms);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  // State for current recommendation preferences
  const [currentPreferences, setCurrentPreferences] = useState<RecommendationRequest | null>(() => {
    // First try to use history preferences if user is logged in and has history
    if (user && historyPreferences) {
      return historyPreferences;
    }
    
    // Otherwise try to use localStorage
    const savedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      
      // Handle runtime conversion from string to array for backward compatibility
      if (parsed.runtime && typeof parsed.runtime === 'string') {
        parsed.runtime = [parsed.runtime];
      }
      
      return parsed;
    }
    return null;
  });
  
  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (currentPreferences) {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(currentPreferences));
    } else {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    }
  }, [currentPreferences]);
  
  // Save disliked film IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dislikedFilmIds', JSON.stringify(dislikedFilmIds));
  }, [dislikedFilmIds]);
  
  // Query for getting recommendations
  const { 
    data: recommendations, 
    isLoading, 
    isFetching,
    refetch: refetchRecommendations
  } = useQuery<Film[]>({
    queryKey: ['/api/recommendations', currentPreferences, seenFilmIds],
    enabled: currentPreferences !== null,
    staleTime: Infinity,
    queryFn: async ({ meta }) => {
      if (!currentPreferences) return [];
      
      // Check if film ratings are loaded and sync from Firestore if needed
      await ensureFirestoreDataLoaded();
      
      // If this is a request for more films, get the requestedBatchSize from meta
      const requestedBatchSize = meta?.requestedBatchSize as number | undefined;
      
      // Combine seen film IDs and disliked film IDs for the exclusion list
      const allIdsWithDuplicates = [...seenFilmIds, ...dislikedFilmIds];
      const allExcludedIds = Array.from(new Set(allIdsWithDuplicates));
      
      // Start with the base preferences
      const basePreferences = { ...currentPreferences };
      
      // Add Firestore preferences (if available) or fall back to user profile data
      const userStreamingServices = preferences.preferences.streamingServices?.length > 0
        ? preferences.preferences.streamingServices
        : user?.streamingServices?.length > 0
          ? user.streamingServices
          : undefined;
          
      const userCountry = preferences.preferences.country
        ? preferences.preferences.country
        : user?.country
          ? user.country
          : undefined;
      
      // Create the full preferences object with all available data
      const preferencesWithUserInfo = {
        ...basePreferences,
        // Add streaming services if available
        streamingServices: userStreamingServices,
        // Add country if available
        country: userCountry,
        // Add exclusions list if applicable
        excludeFilmIds: allExcludedIds.length > 0 ? allExcludedIds : undefined,
        // Add requestedBatchSize if available to ensure consistent number of recommendations
        requestedBatchSize: requestedBatchSize,
        // Add user ratings if available
        userRatings: filmRating.ratings.length > 0 ? filmRating.ratings : undefined
      };

      console.log("Using preferences for recommendations:", preferencesWithUserInfo);
      
      // First check if we have history recommendations and preferences match
      // Only use history if this isn't a "show more" request (no requestedBatchSize)
      if (!requestedBatchSize && user && historyRecommendations && 
          JSON.stringify(historyPreferences) === JSON.stringify(currentPreferences)) {
        console.log("Using saved recommendations from history");
        return historyRecommendations;
      }
        
      const response = await apiRequest('POST', '/api/recommendations', preferencesWithUserInfo);
      const newRecommendations = await response.json();
      
      return newRecommendations;
    }
  });
  
  // Helper function to ensure Firestore data is loaded
  const ensureFirestoreDataLoaded = async () => {
    const tasks = [];
    
    // Sync preferences from Firestore if they're not already loaded
    if (!preferences.preferences.lastUpdated) {
      tasks.push(preferences.syncPreferences());
    }
    
    // Load film ratings from Firestore if they're not already loaded
    if (filmRating.ratings.length === 0) {
      tasks.push(filmRating.loadRatingsFromFirestore());
    }
    
    // Wait for both tasks to complete
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  };
  
  // This effect will ensure history recommendations are available immediately
  useEffect(() => {
    if (user && historyRecommendations && !recommendations && currentPreferences) {
      // This helps pre-populate the query cache with history data
      queryClient.setQueryData(
        ['/api/recommendations', currentPreferences, seenFilmIds], 
        historyRecommendations
      );
    }
  }, [user, historyRecommendations, recommendations, currentPreferences, seenFilmIds]);
  
  // Track the initial batch size when recommendations are first loaded
  useEffect(() => {
    if (recommendations && recommendations.length > 0 && initialBatchSize === 0) {
      setInitialBatchSize(recommendations.length);
    }
  }, [recommendations, initialBatchSize]);
  
  // Mutation for getting more suggestions
  const { mutate: getMoreSuggestions, isPending: isLoadingMore } = useMutation({
    mutationFn: async () => {
      if (!currentPreferences || !recommendations) return [];
      
      // Track current films as seen
      const currentIds = recommendations.map(film => film.id);
      const allSeenIds = [...seenFilmIds, ...currentIds];
      
      // Update seen film IDs
      setSeenFilmIds(allSeenIds);
      
      // Determine batch size for consistent results
      const batchSize = initialBatchSize > 0 ? Math.max(initialBatchSize * 2, 15) : 15; 
      
      // Create a complete preferences object with all exclusions
      const combinedExclusions = Array.from(new Set([...allSeenIds, ...dislikedFilmIds]));
      
      console.log(`Requesting ${batchSize} more recommendations, excluding ${combinedExclusions.length} previously seen films`);
      
      // Ensure Firestore data is loaded before making request
      await ensureFirestoreDataLoaded();
      
      // Get user preferences from Firestore
      const userStreamingServices = preferences.preferences.streamingServices?.length > 0
        ? preferences.preferences.streamingServices
        : user?.streamingServices?.length > 0
          ? user.streamingServices
          : undefined;
          
      const userCountry = preferences.preferences.country
        ? preferences.preferences.country
        : user?.country
          ? user.country
          : undefined;
      
      const requestBody = {
        ...currentPreferences,
        // Add user preferences from Firestore
        streamingServices: userStreamingServices,
        country: userCountry,
        // Add combined exclusions
        excludeFilmIds: combinedExclusions,
        // Add batch size
        requestedBatchSize: batchSize,
        // Add user ratings from Firestore
        userRatings: filmRating.ratings.length > 0 ? filmRating.ratings : undefined,
        // Special flags for more diverse recommendations
        _bypassStreamingFilter: true,
        _disableMoodFilter: true,
        _disableRuntimeFilter: true
      };
      
      // Make the API request
      const response = await apiRequest('POST', '/api/recommendations/more', requestBody);
      const newRecommendations = await response.json();
      
      // Update the React Query cache by appending the new recommendations to existing ones
      if (newRecommendations.length > 0) {
        queryClient.setQueryData(
          ['/api/recommendations', currentPreferences, seenFilmIds], 
          (oldData: Film[] | undefined) => {
            // If we have existing data, append new recommendations to it
            if (oldData && Array.isArray(oldData)) {
              // Filter out any duplicates that might exist in both sets
              const existingIds = new Set(oldData.map(film => film.id));
              const uniqueNewRecommendations = newRecommendations.filter(
                (film: Film) => !existingIds.has(film.id)
              );
              
              return [...oldData, ...uniqueNewRecommendations];
            }
            // If we don't have existing data, just use the new recommendations
            return newRecommendations;
          }
        );
      }
      
      // Track analytics event
      trackEvent(AnalyticsEvents.MORE_RECOMMENDATIONS_REQUESTED, {
        exclusion_count: combinedExclusions.length,
        disliked_count: dislikedFilmIds.length,
        preference_location: currentPreferences.location,
        preference_mood: currentPreferences.mood,
        preference_timeOfDay: currentPreferences.timeOfDay,
        batch_size: batchSize
      });
      
      return newRecommendations;
    }
  });
  
  // Handler for submitting the questionnaire
  const handleSubmitQuestionnaire = (data: RecommendationRequest) => {
    // Reset seen films when starting a new search
    setSeenFilmIds([]);
    setCurrentPreferences(data);
  };
  
  // Handler for resetting recommendations
  const handleReset = () => {
    setCurrentPreferences(null);
    setSeenFilmIds([]);
    // Optionally clear disliked films when starting over
    setDislikedFilmIds([]);
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
  };
  
  // Handler for when a user dislikes a film
  const handleFilmDisliked = (filmId: number) => {
    // Add this film ID to the disliked films list if it's not already there
    if (!dislikedFilmIds.includes(filmId)) {
      setDislikedFilmIds(prev => [...prev, filmId]);
    }
  };
  
  // Force a refresh of recommendations by pulling latest Firestore data
  const refreshRecommendations = async () => {
    // First make sure Firestore data is loaded
    await ensureFirestoreDataLoaded();
    // Then refetch recommendations
    refetchRecommendations();
  };
  
  // Determine if we're showing history recommendations
  const isShowingHistory = 
    user && 
    historyRecommendations && 
    recommendations && 
    JSON.stringify(historyRecommendations) === JSON.stringify(recommendations);
  
  return {
    // Data
    currentPreferences,
    recommendations: recommendations || [],
    isShowingHistory,
    
    // Loading states
    isLoading: isLoading || isFetching || isLoadingMore,
    isLoadingMore,
    
    // Actions
    submitQuestionnaire: handleSubmitQuestionnaire,
    reset: handleReset,
    handleFilmDisliked,
    getMoreSuggestions,
    refreshRecommendations,
    
    // Raw Firestore data access
    userPreferences: preferences.preferences,
    userRatings: filmRating.ratings,
    
    // Flags
    hasMoreToGenerate: recommendations && recommendations.length > 0,
    
    // Helper to ensure Firestore data is loaded
    ensureFirestoreDataLoaded,
  };
}