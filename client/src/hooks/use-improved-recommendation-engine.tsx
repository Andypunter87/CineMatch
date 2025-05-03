import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useImprovedPreferences } from "@/hooks/use-improved-preferences";
import { useImprovedFilmRating } from "@/hooks/use-improved-film-rating";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { useRecommendationHistory } from "@/hooks/use-recommendation-history";
import { useErrorToast } from "@/lib/error-utils";
import { createAppError, ErrorCategory } from "@/lib/error-utils";

const PREFERENCES_STORAGE_KEY = "cinematch_preferences";

/**
 * Improved recommendation engine with enhanced error handling and offline support
 * 
 * This hook manages film recommendations by integrating:
 * - User preferences from Firestore
 * - User ratings from Firestore
 * - Recommendation history
 * - Local preferences storage as fallback
 * - Comprehensive error handling
 */
export function useImprovedRecommendationEngine() {
  const queryClient = useQueryClient();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();
  const {
    recommendations: historyRecommendations,
    preferences: historyPreferences,
    hasHistory
  } = useRecommendationHistory();
  
  // Get user preferences and film ratings with enhanced error handling
  const preferences = useImprovedPreferences(false);
  const filmRating = useImprovedFilmRating(false);
  
  // State for tracking errors
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
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
  
  // Set up network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online, attempting to sync data...');
      setIsOffline(false);
      // Try to sync data when we come back online
      ensureFirestoreDataLoaded().then(() => {
        if (currentPreferences) {
          refetchRecommendations();
        }
      });
    };
    
    const handleOffline = () => {
      console.log('Network connection lost, switching to offline mode...');
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Query for getting recommendations with enhanced error handling
  const { 
    data: recommendations, 
    isLoading, 
    isFetching,
    error: recommendationsError,
    refetch: refetchRecommendations
  } = useQuery<Film[]>({
    queryKey: ['/api/recommendations', currentPreferences, seenFilmIds],
    enabled: currentPreferences !== null,
    staleTime: Infinity,
    retry: isOffline ? 0 : 2, // Don't retry if we're offline
    retryDelay: 1000,
    queryFn: async ({ meta }) => {
      if (!currentPreferences) return [];
      
      // Reset any previous errors
      setLastError(null);
      
      try {
        // If we're offline, use local cache or return empty array
        if (isOffline) {
          const cachedRecommendations = queryClient.getQueryData<Film[]>([
            '/api/recommendations', 
            currentPreferences, 
            seenFilmIds
          ]);
          
          if (cachedRecommendations && cachedRecommendations.length > 0) {
            return cachedRecommendations;
          }
          
          // If we're in offline mode and have history recommendations, use those
          if (user && historyRecommendations && 
              JSON.stringify(historyPreferences) === JSON.stringify(currentPreferences)) {
            return historyRecommendations;
          }
          
          throw createAppError(
            "Unable to get recommendations while offline. Please reconnect to the internet.",
            ErrorCategory.NETWORK,
            "getRecommendations"
          );
        }
        
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
          : user?.streamingServices && user.streamingServices.length > 0
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
      } catch (error) {
        // Set the last error for reference
        setLastError(error as Error);
        
        // Check if it's a network error
        if ((error as Error).message.includes('network') || 
            (error as Error).message.includes('fetch') || 
            !navigator.onLine) {
          setIsOffline(true);
          
          // Try using history as fallback
          if (user && historyRecommendations && 
              JSON.stringify(historyPreferences) === JSON.stringify(currentPreferences)) {
            console.log("Using history recommendations as fallback during network error");
            return historyRecommendations;
          }
        }
        
        // Show a toast with the error
        showErrorToast(
          error as Error,
          "Failed to Get Recommendations"
        );
        
        throw error;
      }
    }
  });
  
  // Helper function to ensure Firestore data is loaded
  const ensureFirestoreDataLoaded = async () => {
    if (isOffline) {
      console.log("Skipping Firestore data loading while offline");
      return;
    }
    
    const tasks = [];
    
    // Sync preferences from Firestore if they're not already loaded
    if (!preferences.preferences.lastUpdated) {
      tasks.push(preferences.syncPreferences().catch(error => {
        console.error("Error syncing preferences:", error);
        showErrorToast(error, "Failed to Sync Preferences");
      }));
    }
    
    // Load film ratings from Firestore if they're not already loaded
    if (filmRating.ratings.length === 0) {
      tasks.push(filmRating.loadRatingsFromFirestore().catch(error => {
        console.error("Error loading film ratings:", error);
        showErrorToast(error, "Failed to Load Film Ratings");
      }));
    }
    
    // Wait for all tasks to complete
    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
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
  }, [user, historyRecommendations, recommendations, currentPreferences, seenFilmIds, queryClient]);
  
  // Track the initial batch size when recommendations are first loaded
  useEffect(() => {
    if (recommendations && recommendations.length > 0 && initialBatchSize === 0) {
      setInitialBatchSize(recommendations.length);
    }
  }, [recommendations, initialBatchSize]);
  
  // Mutation for getting more suggestions with enhanced error handling
  const { mutate: getMoreSuggestions, isPending: isLoadingMore } = useMutation({
    mutationFn: async () => {
      if (!currentPreferences || !recommendations) {
        throw new Error("No current preferences or recommendations available");
      }
      
      // Reset any previous errors
      setLastError(null);
      
      try {
        // If we're offline, show a message and return empty array
        if (isOffline) {
          throw createAppError(
            "Cannot get more suggestions while offline. Please reconnect to the internet.",
            ErrorCategory.NETWORK,
            "getMoreSuggestions"
          );
        }
        
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
          : user?.streamingServices && user.streamingServices.length > 0
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
      } catch (error) {
        // Set the last error for reference
        setLastError(error as Error);
        
        // Check if it's a network error
        if ((error as Error).message.includes('network') || 
            (error as Error).message.includes('fetch') || 
            !navigator.onLine) {
          setIsOffline(true);
        }
        
        // Show a toast with the error
        showErrorToast(
          error as Error,
          "Failed to Get More Suggestions"
        );
        
        throw error;
      }
    }
  });
  
  // Handler for submitting the questionnaire
  const handleSubmitQuestionnaire = useCallback((data: RecommendationRequest) => {
    // Reset seen films when starting a new search
    setSeenFilmIds([]);
    setCurrentPreferences(data);
    // Reset the last error when starting a new search
    setLastError(null);
  }, []);
  
  // Handler for resetting recommendations
  const handleReset = useCallback(() => {
    setCurrentPreferences(null);
    setSeenFilmIds([]);
    // Optionally clear disliked films when starting over
    setDislikedFilmIds([]);
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    // Reset the last error when resetting
    setLastError(null);
  }, []);
  
  // Handler for when a user dislikes a film
  const handleFilmDisliked = useCallback((filmId: number) => {
    // Add this film ID to the disliked films list if it's not already there
    if (!dislikedFilmIds.includes(filmId)) {
      setDislikedFilmIds(prev => [...prev, filmId]);
    }
  }, [dislikedFilmIds]);
  
  // Force a refresh of recommendations by pulling latest Firestore data
  const refreshRecommendations = useCallback(async () => {
    // Reset the last error when refreshing
    setLastError(null);
    
    try {
      // First make sure Firestore data is loaded
      await ensureFirestoreDataLoaded();
      // Then refetch recommendations
      await refetchRecommendations();
    } catch (error) {
      // Set the last error for reference
      setLastError(error as Error);
      
      // Show a toast with the error
      showErrorToast(
        error as Error,
        "Failed to Refresh Recommendations"
      );
    }
  }, [ensureFirestoreDataLoaded, refetchRecommendations, showErrorToast]);
  
  // Retry getting recommendations after an error
  const retryAfterError = useCallback(async () => {
    // Reset the last error
    setLastError(null);
    
    try {
      // Check if we're now online
      if (isOffline && navigator.onLine) {
        setIsOffline(false);
      }
      
      // Try to reload Firestore data
      await ensureFirestoreDataLoaded();
      
      // Refetch recommendations
      await refetchRecommendations();
    } catch (error) {
      // Set the last error for reference
      setLastError(error as Error);
      
      // Show a toast with the error
      showErrorToast(
        error as Error,
        "Retry Failed"
      );
    }
  }, [isOffline, ensureFirestoreDataLoaded, refetchRecommendations, showErrorToast]);
  
  // Determine if we're showing history recommendations
  const isShowingHistory = !!(
    user && 
    historyRecommendations && 
    recommendations && 
    JSON.stringify(historyRecommendations) === JSON.stringify(recommendations)
  );
  
  return {
    // Data
    currentPreferences,
    recommendations: recommendations || [],
    isShowingHistory,
    
    // Loading and error states
    isLoading: isLoading || isFetching || isLoadingMore,
    isLoadingMore,
    error: lastError || recommendationsError,
    isError: !!lastError || !!recommendationsError,
    isOffline,
    
    // Actions
    submitQuestionnaire: handleSubmitQuestionnaire,
    reset: handleReset,
    handleFilmDisliked,
    getMoreSuggestions,
    refreshRecommendations,
    retryAfterError,
    
    // Raw Firestore data access
    userPreferences: preferences.preferences,
    userRatings: filmRating.ratings,
    
    // Flags
    hasMoreToGenerate: recommendations && recommendations.length > 0,
    
    // Helper to ensure Firestore data is loaded
    ensureFirestoreDataLoaded,
  };
}