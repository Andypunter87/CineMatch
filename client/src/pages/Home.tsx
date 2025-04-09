import { useState, useEffect } from "react";
import Questionnaire from "@/components/Questionnaire";
import Recommendations from "@/components/Recommendations";
import { type RecommendationRequest, type Film } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

// Local storage key for saving preferences
const PREFERENCES_STORAGE_KEY = "cinematch_preferences";

export default function Home() {
  const { user } = useAuth();
  // Initialize from localStorage if available
  const [showQuestionnaire, setShowQuestionnaire] = useState(() => {
    const savedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return !savedPreferences; // Show questionnaire if no saved preferences
  });
  
  // Keep track of which film IDs we've already shown
  const [seenFilmIds, setSeenFilmIds] = useState<number[]>([]);
  
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
  
  const { data: recommendations, isLoading } = useQuery<Film[]>({
    // Remove dislikedFilmIds from the queryKey to prevent automatic refetching when films are disliked
    // The dislikedFilmIds will still be used in the query function but won't trigger a refetch
    queryKey: ['/api/recommendations', preferences, seenFilmIds],
    enabled: preferences !== null,
    staleTime: Infinity,
    queryFn: async () => {
      if (!preferences) return [];
      
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
        excludeFilmIds: allExcludedIds.length > 0 ? allExcludedIds : undefined
      };
        
      const response = await apiRequest('POST', '/api/recommendations', preferencesWithUserInfo);
      const newRecommendations = await response.json();
      
      // Update the seen films list with the new recommendations
      if (newRecommendations.length > 0 && seenFilmIds.length > 0) {
        const newIds = newRecommendations.map((film: Film) => film.id);
        // We don't need to update state here because it would trigger a re-render loop
        // The update happens in the more suggestions handler
      }
      
      return newRecommendations;
    }
  });
  
  // Mutation for getting more suggestions
  const { mutate: getMoreSuggestions, isPending: isLoadingMore } = useMutation({
    mutationFn: async () => {
      if (!preferences || !recommendations) return [];
      
      // Track current films as seen
      const currentIds = recommendations.map(film => film.id);
      const allSeenIds = [...seenFilmIds, ...currentIds];
      
      // Update seen film IDs
      setSeenFilmIds(allSeenIds);
      
      // Force a refetch with the updated exclusion list
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      
      // Calculate total exclusions for analytics 
      const allExclusionsWithDuplicates = [...allSeenIds, ...dislikedFilmIds];
      const totalExclusions = Array.from(new Set(allExclusionsWithDuplicates)).length;
      
      // Track analytics event
      trackEvent(AnalyticsEvents.MORE_RECOMMENDATIONS_REQUESTED, {
        exclusion_count: totalExclusions,
        disliked_count: dislikedFilmIds.length,
        preference_location: preferences.location,
        preference_mood: preferences.mood,
        preference_timeOfDay: preferences.timeOfDay
      });
      
      return true;
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
          <Recommendations 
            recommendations={recommendations || []} 
            isLoading={isLoading || isLoadingMore} 
            preferences={preferences!} 
            onReset={handleReset}
            onGenerateMore={getMoreSuggestions}
            hasMoreToGenerate={recommendations && recommendations.length > 0}
            onDisliked={handleFilmDisliked}
          />
        )}
      </div>
    </div>
  );
}
