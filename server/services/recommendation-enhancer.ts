import { Film, RecommendationRequest } from "@shared/schema";
import { getAIRecommendations } from "./openai";
import { 
  searchMovies, 
  getMovieWatchProviders, 
  convertTMDBMovieToFilm,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies
} from "./tmdb";
import { 
  getUserFilmFeedback, 
  extractPreferenceWeights,
  applyFeedbackWeights 
} from './firestore-feedback-reader';

// Create a cache for movie data to avoid redundant API calls
const tmdbMovieCache = new Map<string, any>();
const TMDB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds (movie data rarely changes)
const MAX_CACHE_SIZE = 1000; // Maximum number of items to keep in cache

// Function to clean up old cache entries
function cleanupCache() {
  if (tmdbMovieCache.size > MAX_CACHE_SIZE) {
    console.log(`Cache size (${tmdbMovieCache.size}) exceeds limit, cleaning up old entries...`);
    const now = Date.now();
    const entries = Array.from(tmdbMovieCache.entries());
    
    // Sort by age (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we're back under the limit
    const entriesToRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    
    // Track different types of cache entries being removed
    const removedKeyTypes: Record<string, number> = {};
    
    entriesToRemove.forEach(([key]) => {
      tmdbMovieCache.delete(key);
      
      // Track the type of entry being removed (for logging)
      const keyType = key.split(':')[0] || 'unknown';
      removedKeyTypes[keyType] = (removedKeyTypes[keyType] || 0) + 1;
    });
    
    console.log(`Removed ${entriesToRemove.length} cache entries:`, removedKeyTypes);
  }
}

/**
 * Enhanced recommendation service that combines AI recommendations with TMDB data
 * for accurate streaming service availability
 */
export async function getEnhancedRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  // Performance optimization: start timestamp
  const startTime = Date.now();
  
  // Get user feedback from Firestore if userId is provided
  let userFeedback: any[] = [];
  let feedbackWeights = { moodWeights: {}, runtimeWeights: {}, hasPreferences: false };
  
  // Track if this is a co-watching recommendation
  const isCoWatching = !!preferences.friendUserId;
  
  if (preferences.userId) {
    console.log(`Retrieving Firestore feedback for user ID: ${preferences.userId}`);
    userFeedback = await getUserFilmFeedback(preferences.userId);
    
    if (userFeedback.length > 0) {
      console.log(`Found ${userFeedback.length} feedback entries in Firestore to influence recommendations`);
      feedbackWeights = extractPreferenceWeights(userFeedback);
    } else {
      console.log('No feedback found in Firestore for this user');
    }
    
    // If this is a co-watching scenario, get friend's feedback and preferences
    if (isCoWatching && preferences.friendUserId) {
      // Import friend-specific feedback functions dynamically
      try {
        const friendModule = await import('./friend-feedback-reader');
        if (friendModule && friendModule.getFriendFilmFeedback) {
          console.log(`Getting friend feedback for user ID: ${preferences.friendUserId}`);
          // This will merge friend weights with user weights
          await friendModule.getFriendFilmFeedback(preferences.friendUserId, feedbackWeights);
        }
      } catch (error) {
        console.error('Error loading friend feedback module:', error);
      }
    }
  }
  
  // If we have user-rated films as part of onboarding, we can use these
  // to help filter our recommendations (add weights, etc.)
  if (preferences.userRatedFilms && preferences.userRatedFilms.length > 0) {
    console.log(`Found ${preferences.userRatedFilms.length} user-rated films from onboarding`);
    // In the future, we could incorporate these into our recommendation logic
  }

  // First try to get AI personalized recommendations
  const recommendationResponse = await getAIRecommendations(preferences);
  
  if (!recommendationResponse || recommendationResponse.length === 0) {
    console.error('Failed to get AI recommendations');
    return [];
  }
  
  console.log(`Got ${recommendationResponse.length} AI recommendations, enhancing with TMDB data...`);
  
  // Then enhance each recommended film with TMDB data (in parallel)
  const enhancedRecommendationsPromises = recommendationResponse.map(async (film) => {
    try {
      // Generate cache key based on title and year
      const cacheKey = `film:${film.title}:${film.year}`;
      
      // Check if we have this film in cache
      if (tmdbMovieCache.has(cacheKey)) {
        const cachedData = tmdbMovieCache.get(cacheKey);
        // Check if cache entry is still valid
        if (Date.now() - cachedData.timestamp < TMDB_CACHE_TTL) {
          console.log(`Using cached data for "${film.title}" (${film.year})`);
          
          // Return cached film with source field added
          const cachedFilm = cachedData.data;
          
          // Determine source based on recommendation context
          let source: 'onboarding' | 'friend' | 'feedback' | 'fallback' = 'fallback';
          
          if (isCoWatching && preferences.friendUserId) {
            source = 'friend';
          } else if (feedbackWeights.hasPreferences) {
            source = 'feedback';
          } else if (preferences.userRatedFilms && preferences.userRatedFilms.length > 0) {
            source = 'onboarding';
          }
          
          return {
            ...cachedFilm,
            source
          };
        }
        
        // If cache has expired, remove it
        tmdbMovieCache.delete(cacheKey);
      }
      
      // Search for the movie in TMDB
      const query = `${film.title} ${film.year}`;
      const searchResults = await searchMovies(query);
      
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        // Convert the first result to our Film format
        const tmdbMovie = searchResults[0];
        const tmdbFilm = await convertTMDBMovieToFilm(tmdbMovie);
        
        // Get streaming services where this film is available (depends on user country)
        let availableOn: string[] = [];
        
        if (preferences.streamingServices && preferences.streamingServices.length > 0 && 
            preferences.country && tmdbFilm.availableStreamingByCountry) {
          // Get available services in user's country
          const countrySvcs = tmdbFilm.availableStreamingByCountry[preferences.country] || [];
          
          // Filter to only include services the user has selected
          availableOn = countrySvcs.filter(service => 
            preferences.streamingServices?.some(userService => {
              // Normalize service names for comparison
              const normalizedService = service.toLowerCase()
                .replace('netflix', 'netflix')
                .replace('amazon', 'amazon')
                .replace('prime', 'amazon')
                .replace('hbo', 'hbo')
                .replace('disney+', 'disney')
                .replace('disneyplus', 'disney')
                .replace('apple', 'apple')
                .replace('appletvplus', 'apple')
                .replace('hulu', 'hulu')
                .replace('paramount+', 'paramount')
                .replace('paramountplus', 'paramount')
                .replace('bbc', 'bbc')
                .replace('bbciplayer', 'bbc')
                .replace('mubi', 'mubi');
              
              const normalizedUserService = userService.toLowerCase();
              
              // Check for exact matches in normalized names first
              if (normalizedService === normalizedUserService) {
                return true;
              }
              
              // Then check if one contains the other as a fallback for unusual service names
              return normalizedService.includes(normalizedUserService) || 
                     normalizedUserService.includes(normalizedService);
            }
          )
        );
      }
      
      // Apply feedback weights if available
      let baseScore = film.matchPercentage || 85; // Base score from matchPercentage
      if (feedbackWeights.hasPreferences) {
        // Create a score object with original matchPercentage as the score
        const scoreObj = { ...film, score: baseScore };
        const adjustedScore = applyFeedbackWeights(scoreObj, preferences, feedbackWeights);
        
        // Adjust matchPercentage based on the new score (max possible score around 100)
        const adjustedMatchPercentage = Math.min(98, Math.max(70, Math.floor(adjustedScore)));
        film.matchPercentage = adjustedMatchPercentage;
      }
      
      // Determine the recommendation source
      type SourceType = 'onboarding' | 'friend' | 'feedback' | 'fallback';
      let recommendationSource: SourceType = 'fallback';
      
      // First check if this is a co-watching scenario with a friend
      if (isCoWatching && preferences.friendUserId) {
        recommendationSource = 'friend';
      } 
      // Then check if we have feedback that influenced the recommendation
      else if (feedbackWeights.hasPreferences) {
        recommendationSource = 'feedback';
      } 
      // Finally check if this is based on onboarding preferences (no personalization yet)
      else if (preferences.userRatedFilms && preferences.userRatedFilms.length > 0) {
        recommendationSource = 'onboarding';
      }
      // Otherwise it's a fallback recommendation

      // Define the return Film object with correct typing
      const enhancedFilm: Film = {
        ...film,
        tmdbId: tmdbMovie.id,
        // Use TMDB poster if available, otherwise keep the original
        posterUrl: tmdbFilm.posterUrl || film.posterUrl,
        // Include streaming availability
        availableOn,
        // Include TMDB metadata
        runtime: tmdbFilm.runtime || undefined,
        voteAverage: tmdbFilm.voteAverage || undefined,
        originalLanguage: tmdbFilm.originalLanguage || undefined,
        releaseDate: tmdbFilm.releaseDate || undefined,
        // Include Firestore influence in match reason if applicable
        matchReason: feedbackWeights.hasPreferences ? 
          `${film.matchReason || ''} (Personalized based on your feedback)` : 
          film.matchReason,
        // Include full streaming data for all countries
        availableStreamingByCountry: tmdbFilm.availableStreamingByCountry,
        // Add source field indicating where this recommendation came from
        source: recommendationSource,
        // Add special flags to help with post-processing
        hasStreamingData: true,
        hasCompleteData: !!(tmdbFilm.posterUrl && tmdbFilm.runtime) // Flag to indicate if film has all required data
      };
      
      // Add to cache for future use
      tmdbMovieCache.set(cacheKey, {
        data: enhancedFilm,
        timestamp: Date.now()
      });
      
      // Clean up cache if needed
      cleanupCache();
      
      return enhancedFilm;
    }
    
    // If no match found, mark as incomplete data and set fallback source
    const fallbackFilm: Film = {
      ...film,
      source: 'fallback',
      hasCompleteData: false
    };
    return fallbackFilm;
  } catch (error) {
    console.error(`Error enhancing recommendation for "${film.title}":`, error);
    return {
      ...film,
      source: 'fallback',
      hasCompleteData: false
    }; // Return original film if enhancement fails
  }
});

  // Wait for all enhancements to complete
  const enhancedRecommendations = await Promise.all(enhancedRecommendationsPromises);
  
  // Filter recommendations based on runtime preferences if specified
  let filteredRecommendations = enhancedRecommendations;
  
  if (preferences.runtime && preferences.runtime.length > 0) {
    filteredRecommendations = filterRecommendationsByRuntime(
      enhancedRecommendations,
      preferences.runtime as Array<"short" | "medium" | "long">
    );
    console.log(`Filtered ${enhancedRecommendations.length} recommendations to ${filteredRecommendations.length} based on runtime preferences`);
  }
  
  // Filter recommendations based on mood if specified
  if (preferences.mood) {
    const moodFilteredRecommendations = filterRecommendationsByMood(
      filteredRecommendations,
      preferences.mood
    );
    
    // Only apply mood filtering if we don't filter out too many films
    if (moodFilteredRecommendations.length >= 3 || moodFilteredRecommendations.length === filteredRecommendations.length) {
      filteredRecommendations = moodFilteredRecommendations;
      console.log(`Filtered to ${filteredRecommendations.length} recommendations based on mood "${preferences.mood}"`);
    } else {
      console.log(`Mood filtering would leave only ${moodFilteredRecommendations.length} recommendations, skipping to preserve diversity`);
    }
  }
  
  // Apply final post-processing
  const finalRecommendations = await postProcessRecommendations(
    filteredRecommendations,
    preferences
  );
  
  // Report how long this took (for performance monitoring)
  const endTime = Date.now();
  console.log(`Enhanced recommendations generated in ${endTime - startTime}ms`);
  
  return finalRecommendations;
}

/**
 * Filters recommendations to ensure they match the user's runtime preferences
 * This provides an additional verification step after AI recommendations
 */
function filterRecommendationsByRuntime(recommendations: Film[], runtimePrefs: Array<"short" | "medium" | "long">): Film[] {
  // If no runtime preferences or no recommendations with runtime data, return all
  if (!runtimePrefs.length || !recommendations.some(film => !!film.runtime)) {
    return recommendations;
  }
  
  return recommendations.filter(film => {
    // If we don't have runtime data, include it anyway
    if (!film.runtime) return true;
    
    // Match runtime categories
    const runtime = film.runtime;
    
    if (runtime < 90 && runtimePrefs.includes("short")) return true;
    if (runtime >= 90 && runtime <= 120 && runtimePrefs.includes("medium")) return true;
    if (runtime > 120 && runtimePrefs.includes("long")) return true;
    
    return false;
  });
}

function filterRecommendationsByMood(recommendations: Film[], mood: string): Film[] {
  // If no mood filter or no recommendations, return all
  if (!mood || !recommendations.length) {
    return recommendations;
  }
  
  // Map moods to likely genres
  const moodGenreMap: Record<string, string[]> = {
    'relaxed': ['Comedy', 'Romance', 'Animation', 'Family'],
    'energetic': ['Action', 'Adventure', 'Science Fiction', 'Sport'],
    'thoughtful': ['Drama', 'Documentary', 'History', 'War'],
    'tense': ['Thriller', 'Crime', 'Mystery'],
    'emotional': ['Drama', 'Romance', 'Music'],
    'scared': ['Horror', 'Thriller', 'Mystery'],
    'sophisticated': ['Documentary', 'History', 'Foreign', 'Drama'],
  };
  
  // Get genres that match this mood
  const matchingGenres = moodGenreMap[mood.toLowerCase()] || [];
  
  if (!matchingGenres.length) {
    return recommendations; // No genre mapping for this mood
  }
  
  // Filter films that have at least one matching genre
  return recommendations.filter(film => {
    if (!film.genres || !film.genres.length) return true; // Include if no genre data
    
    // Check if any of the film's genres match our mood-appropriate genres
    return film.genres.some(genre => 
      matchingGenres.some(moodGenre => 
        genre.toLowerCase().includes(moodGenre.toLowerCase())
      )
    );
  });
}

async function postProcessRecommendations(
  recommendations: Film[],
  preferences: RecommendationRequest
): Promise<Film[]> {
  // Boost recommendations that match user's streaming services
  if (preferences.streamingServices && preferences.streamingServices.length > 0) {
    recommendations = recommendations.map(film => {
      // If this film is available on user's streaming services, boost its score slightly
      if (film.availableOn && film.availableOn.length > 0) {
        const boost = Math.min(5, film.availableOn.length * 2); // Boost by 2% per service, max 5%
        
        if (film.matchPercentage) {
          film.matchPercentage = Math.min(99, film.matchPercentage + boost);
        }
      }
      return film;
    });
  }
  
  // Sort by match percentage (descending)
  recommendations.sort((a, b) => {
    const scoreA = a.matchPercentage || 0;
    const scoreB = b.matchPercentage || 0;
    return scoreB - scoreA;
  });
  
  // Ensure we don't have more than 10 recommendations
  return recommendations.slice(0, 10);
}