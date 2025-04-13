import { useState, useEffect } from "react";
import Questionnaire from "@/components/Questionnaire";
import Recommendations from "@/components/Recommendations";
import { type RecommendationRequest, type Film } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useRecommendationHistory } from "@/hooks/use-recommendation-history";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

// Local storage key for saving preferences
const PREFERENCES_STORAGE_KEY = "cinematch_preferences";

export default function Home() {
  const { user } = useAuth();
  const { 
    recommendations: historyRecommendations, 
    preferences: historyPreferences, 
    isLoading: isLoadingHistory,
    hasHistory
  } = useRecommendationHistory();
  
  // Initialize from localStorage or recommendation history
  const [showQuestionnaire, setShowQuestionnaire] = useState(() => {
    // First check if we have a saved history from the server
    if (user && hasHistory) {
      return false;
    }
    
    // Otherwise check local storage
    const savedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return !savedPreferences; // Show questionnaire if no saved preferences
  });
  
  // Keep track of which film IDs we've already shown
  const [seenFilmIds, setSeenFilmIds] = useState<number[]>([]);
  
  // Keep track of the initial batch size to ensure consistent "Show More" behavior
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
  
  const [preferences, setPreferences] = useState<RecommendationRequest | null>(() => {
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
    if (preferences) {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } else {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    }
  }, [preferences]);
  
  // Save disliked film IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dislikedFilmIds', JSON.stringify(dislikedFilmIds));
  }, [dislikedFilmIds]);
  
  const { data: recommendations, isLoading, isFetching } = useQuery<Film[]>({
    // Remove dislikedFilmIds from the queryKey to prevent automatic refetching when films are disliked
    // The dislikedFilmIds will still be used in the query function but won't trigger a refetch
    queryKey: ['/api/recommendations', preferences, seenFilmIds],
    enabled: preferences !== null,
    staleTime: Infinity,
    queryFn: async ({ meta }) => {
      if (!preferences) return [];
      
      // If this is a request for more films, get the requestedBatchSize from meta
      // This ensures we return the same number of films each time
      const requestedBatchSize = meta?.requestedBatchSize as number | undefined;
      
      // Combine seen film IDs and disliked film IDs for the exclusion list
      // Use a more compatible approach to deduplicate the arrays
      const allIdsWithDuplicates = [...seenFilmIds, ...dislikedFilmIds];
      const allExcludedIds = Array.from(new Set(allIdsWithDuplicates));
      
      // If user is logged in, add their streaming services and country to preferences
      const preferencesWithUserInfo = {
        ...preferences,
        // Add streaming services if user has selected them
        streamingServices: user?.streamingServices?.length ? user.streamingServices : undefined,
        // Add country if user has specified one
        country: user?.country || undefined,
        // Add exclusions list if applicable
        excludeFilmIds: allExcludedIds.length > 0 ? allExcludedIds : undefined,
        // Add requestedBatchSize if available to ensure consistent number of recommendations
        requestedBatchSize: requestedBatchSize
      };

      // First check if we have history recommendations and preferences match
      // Only use history if this isn't a "show more" request (no requestedBatchSize)
      if (!requestedBatchSize && user && historyRecommendations && 
          JSON.stringify(historyPreferences) === JSON.stringify(preferences)) {
        console.log("Using saved recommendations from history");
        return historyRecommendations;
      }
        
      const response = await apiRequest('POST', '/api/recommendations', preferencesWithUserInfo);
      const newRecommendations = await response.json();
      
      // If this is an initial request (not a "show more" request), save the batch size
      if (!requestedBatchSize && newRecommendations.length > 0) {
        // We don't set initialBatchSize directly here as it could cause a re-render loop
        // The useEffect hook will handle this update
      }
      
      return newRecommendations;
    }
  });
  
  // This effect will ensure history recommendations are available immediately
  useEffect(() => {
    if (user && historyRecommendations && !recommendations && preferences) {
      // This helps pre-populate the query cache with history data
      queryClient.setQueryData(['/api/recommendations', preferences, seenFilmIds], historyRecommendations);
    }
  }, [user, historyRecommendations, recommendations, preferences, seenFilmIds]);
  
  // Track the initial batch size when recommendations are first loaded
  useEffect(() => {
    if (recommendations && recommendations.length > 0 && initialBatchSize === 0) {
      setInitialBatchSize(recommendations.length);
    }
  }, [recommendations, initialBatchSize]);
  
  // Mutation for getting more suggestions
  const { mutate: getMoreSuggestions, isPending: isLoadingMore } = useMutation({
    mutationFn: async () => {
      if (!preferences || !recommendations) return [];
      
      // Track current films as seen
      const currentIds = recommendations.map(film => film.id);
      const allSeenIds = [...seenFilmIds, ...currentIds];
      
      // Update seen film IDs
      setSeenFilmIds(allSeenIds);
      
      // Determine batch size for consistent results
      // For "Show More" requests, we want at least the same number as the initial load
      // For more diverse recommendations, request a larger number (at least 8-10)
      // This ensures we get at least 4-5 new films even after filtering
      const batchSize = initialBatchSize > 0 ? Math.max(initialBatchSize + 4, 10) : 10; 
      
      // Create a complete preferences object with all exclusions
      const combinedExclusions = Array.from(new Set([...allSeenIds, ...dislikedFilmIds]));
      
      console.log(`Requesting ${batchSize} more recommendations, excluding ${combinedExclusions.length} previously seen films`);
      
      const requestBody = {
        ...preferences,
        excludeFilmIds: combinedExclusions,
        requestedBatchSize: batchSize
      };
      
      // Make the API request to get more recommendations using the special "more" endpoint
      const response = await apiRequest('POST', '/api/recommendations/more', requestBody);
      const newRecommendations = await response.json();
      
      // Update the React Query cache by appending the new recommendations to existing ones
      if (newRecommendations.length > 0) {
        queryClient.setQueryData(
          ['/api/recommendations', preferences, seenFilmIds], 
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
      
      // Calculate total exclusions for analytics 
      const totalExclusions = combinedExclusions.length;
      
      // Track analytics event
      trackEvent(AnalyticsEvents.MORE_RECOMMENDATIONS_REQUESTED, {
        exclusion_count: totalExclusions,
        disliked_count: dislikedFilmIds.length,
        preference_location: preferences.location,
        preference_mood: preferences.mood,
        preference_timeOfDay: preferences.timeOfDay,
        batch_size: batchSize
      });
      
      return newRecommendations;
    }
  });

  const handleSubmitQuestionnaire = (data: RecommendationRequest) => {
    // Reset seen films when starting a new search
    setSeenFilmIds([]);
    setPreferences(data);
    setShowQuestionnaire(false);
  };

  const handleReset = () => {
    setPreferences(null);
    setSeenFilmIds([]);
    // Optionally clear disliked films when starting over
    // Comment out the next line if you want disliked films to persist across sessions
    setDislikedFilmIds([]);
    localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    setShowQuestionnaire(true);
  };
  
  // Handler for when a user dislikes a film
  const handleFilmDisliked = (filmId: number) => {
    // Add this film ID to the disliked films list if it's not already there
    if (!dislikedFilmIds.includes(filmId)) {
      setDislikedFilmIds(prev => [...prev, filmId]);
    }
  };

  // Determine if we're showing history recommendations
  const isShowingHistory = 
    user && 
    historyRecommendations && 
    recommendations && 
    JSON.stringify(historyRecommendations) === JSON.stringify(recommendations);

  return (
    <div className="container mx-auto px-4 py-6 bg-white">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          The Right Movie For Right Now
        </h1>
        <p className="text-center text-gray-600 max-w-2xl mx-auto">
          Tell us about your mood and preferences, and we'll recommend the perfect films for you to watch.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {showQuestionnaire ? (
          <>
            <Questionnaire onSubmit={handleSubmitQuestionnaire} />
            
            {user && user.streamingServices && user.streamingServices.length > 0 && (
              <div className="mt-6 text-center text-sm bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-2xl mx-auto shadow-[0_4px_14px_0_rgba(59,130,246,0.2)]">
                <span className="font-medium text-blue-700">Streaming match:</span> We'll search for films available on your preferred platforms 
                ({user.streamingServices.join(", ")}) in {user.country || "your country"}.
              </div>
            )}
          </>
        ) : (
          <>
            {isShowingHistory && (
              <div className="mb-4 text-center text-sm bg-indigo-50 border border-indigo-100 rounded-lg p-3 max-w-2xl mx-auto shadow-[0_4px_14px_0_rgba(79,70,229,0.2)]">
                <span className="font-medium text-indigo-700">Welcome back!</span> We've loaded your previous recommendations.
              </div>
            )}
            <Recommendations 
              recommendations={recommendations || []} 
              isLoading={isLoading || isFetching || isLoadingMore} 
              preferences={preferences!} 
              onReset={handleReset}
              onGenerateMore={getMoreSuggestions}
              hasMoreToGenerate={recommendations && recommendations.length > 0}
              onDisliked={handleFilmDisliked}
            />
          </>
        )}
      </div>
    </div>
  );
}
