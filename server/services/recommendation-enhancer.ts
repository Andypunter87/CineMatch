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
    
    // Log details about what types of cache entries were removed
    console.log(`Removed ${entriesToRemove.length} cache entries by type:`);
    Object.entries(removedKeyTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} entries`);
    });
    
    console.log(`Cache cleanup complete. New size: ${tmdbMovieCache.size}`);
  }
}

/**
 * Enhanced recommendation service that combines AI recommendations with TMDB data
 * for accurate streaming service availability
 */
import { 
  getUserFilmFeedback, 
  extractPreferenceWeights,
  applyFeedbackWeights 
} from './firestore-feedback-reader';

export async function getEnhancedRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  try {
    // Performance optimization: start timestamp
    const startTime = Date.now();
    
    // Get user feedback from Firestore if userId is provided
    let userFeedback = [];
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
        const { 
          getFriendPreferences, 
          combineWeights,
          combinePreferences,
          generatePersonalizationSummary
        } = await import('./friend-feedback-reader');
        
        console.log(`Processing co-watching recommendation with friend ID: ${preferences.friendUserId}`);
        
        // Get friend's feedback for weighting
        const friendFeedback = await getUserFilmFeedback(preferences.friendUserId);
        let friendWeights = { moodWeights: {}, runtimeWeights: {}, hasPreferences: false };
        
        if (friendFeedback.length > 0) {
          console.log(`Found ${friendFeedback.length} feedback entries for friend to influence recommendations`);
          friendWeights = extractPreferenceWeights(friendFeedback);
        } else {
          console.log('No feedback found in Firestore for friend');
        }
        
        // Get friend's preferences
        const friendPreferences = await getFriendPreferences(preferences.friendUserId);
        
        // Weight ratio between primary user and friend (default 0.5 = equal weight)
        const weightRatio = preferences.weightRatio !== undefined ? preferences.weightRatio : 0.5;
        
        // Combine weights from both users
        feedbackWeights = combineWeights(feedbackWeights, friendWeights, weightRatio);
        
        // Add a personalization summary if one isn't already provided
        if (!preferences.personalizationSummary && friendPreferences) {
          // Extract shared moods and genres for personalization
          const userMoods = Object.keys(feedbackWeights.moodWeights).filter(
            mood => feedbackWeights.moodWeights[mood]?.liked > feedbackWeights.moodWeights[mood]?.disliked
          );
          
          // Get genres from user preferences (not exposed in enhanced recommendataions yet)
          const userName = 'You';
          const friendName = friendPreferences.name || 'your friend';
          
          // Generate personalization summary
          preferences.personalizationSummary = generatePersonalizationSummary(
            userName,
            friendName,
            userMoods,
            [] // No genre data in feedback yet
          );
          
          console.log(`Generated personalization summary: ${preferences.personalizationSummary}`);
        }
      }
    }
    
    // Check if this request has the bypass flag 
    const bypassStreamingFilter = preferences._bypassStreamingFilter === true;
    if (bypassStreamingFilter) {
      console.log("Bypass streaming filter flag detected - will return broader set of recommendations");
    }
    
    // Ensure we have a requested batch size
    const requestedBatchSize = preferences.requestedBatchSize || 6;
    
    // First get the AI recommendations with explicit batch size
    const aiRecommendations = await getAIRecommendations({
      ...preferences,
      requestedBatchSize: requestedBatchSize
    });
    
    console.log(`AI recommendations retrieved in ${Date.now() - startTime}ms`);
    
    // Enhance each recommendation with TMDB data - use individual promise handling for better resilience
    const enhancedRecommendations = await Promise.all(aiRecommendations.map(async (film) => {
      try {
        // Create a more precise search query with both title and year
        let searchQuery = `${film.title} ${film.year}`;
        
        // Check if we have this film in the cache
        const cacheKey = `search:${searchQuery}`;
        const cachedSearch = tmdbMovieCache.get(cacheKey);
        let searchResults;
          
          if (cachedSearch && (Date.now() - cachedSearch.timestamp) < TMDB_CACHE_TTL) {
            // Use cached results
            console.log(`Using cached TMDB search results for: ${searchQuery}`);
            searchResults = cachedSearch.data;
          } else {
            // Search for the film in TMDB database
            searchResults = await searchMovies(searchQuery, 1);
            
            // Cache the results
            tmdbMovieCache.set(cacheKey, {
              timestamp: Date.now(),
              data: searchResults
            });
            
            // Cache maintenance
            cleanupCache();
          }
          
          // If no results, try with just the title (sometimes year can be inaccurate)
          if (!searchResults.results || searchResults.results.length === 0) {
            const titleOnlyCacheKey = `search:${film.title}`;
            const cachedTitleSearch = tmdbMovieCache.get(titleOnlyCacheKey);
            
            if (cachedTitleSearch && (Date.now() - cachedTitleSearch.timestamp) < TMDB_CACHE_TTL) {
              // Use cached results for title-only search
              console.log(`Using cached TMDB title-only search results for: ${film.title}`);
              searchResults = cachedTitleSearch.data;
            } else {
              searchResults = await searchMovies(film.title, 1);
              
              // Cache the title-only results
              tmdbMovieCache.set(titleOnlyCacheKey, {
                timestamp: Date.now(),
                data: searchResults
              });
              
              // Cache maintenance
              cleanupCache();
            }
          }
          
          // If we found a match
          if (searchResults.results && searchResults.results.length > 0) {
            // Sort results by relevance - prioritize closest year match if we have multiple results
            const sortedResults = searchResults.results
              .sort((a: any, b: any) => {
                if (a.release_date && b.release_date) {
                  const yearA = parseInt(a.release_date.split('-')[0]);
                  const yearB = parseInt(b.release_date.split('-')[0]);
                  return Math.abs(yearA - film.year) - Math.abs(yearB - film.year);
                }
                return 0;
              });
            
            // Get the closest match after sorting
            const tmdbMovie = sortedResults[0];
            
            // Get streaming providers for this movie - check cache first
            const watchProvidersKey = `providers:${tmdbMovie.id}`;
            let watchProviders;
            
            const cachedProviders = tmdbMovieCache.get(watchProvidersKey);
            if (cachedProviders && (Date.now() - cachedProviders.timestamp) < TMDB_CACHE_TTL) {
              // Use cached providers data
              console.log(`Using cached TMDB watch providers for movie ID: ${tmdbMovie.id}`);
              watchProviders = cachedProviders.data;
            } else {
              // Fetch providers from API
              watchProviders = await getMovieWatchProviders(tmdbMovie.id);
              
              // Cache the watch providers
              tmdbMovieCache.set(watchProvidersKey, {
                timestamp: Date.now(),
                data: watchProviders
              });
              
              // Keep the cache size in check
              cleanupCache();
            }
            
            // Convert to our Film format with streaming data
            const tmdbFilm = await convertTMDBMovieToFilm(tmdbMovie);
            
            // Filter streaming services to only show the ones the user has access to
            // Convert country names to ISO codes that TMDB expects
            let countryCode = preferences.country?.toUpperCase() || 'US';
            
            // Special handling for UK which is "GB" in TMDB
            if (countryCode === 'UNITED KINGDOM' || countryCode === 'UNITED_KINGDOM' || countryCode === 'UK') {
              countryCode = 'GB';
            }
            
            console.log(`Using country code: ${countryCode} for streaming service filtering`);
            let availableOn: string[] = [];
            
            // If the user has specified streaming services and the movie is available in their country
            if (preferences.streamingServices && 
                preferences.streamingServices.length > 0 &&
                tmdbFilm.availableStreamingByCountry &&
                tmdbFilm.availableStreamingByCountry[countryCode]) {
              
              // Filter to only include services the user has
              availableOn = tmdbFilm.availableStreamingByCountry[countryCode].filter(
                service => preferences.streamingServices!.some(
                  userService => {
                    // Standardize service names for more accurate comparison
                    const serviceLower = service.toLowerCase().trim();
                    const userServiceLower = userService.toLowerCase().trim();
                    
                    // Create normalized versions of service names
                    const normalizedService = serviceLower
                      .replace(/\s+/g, '')
                      .replace('amazon', 'prime')
                      .replace('primevideo', 'prime')
                      .replace('netflix', 'netflix')
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
                      
                    const normalizedUserService = userServiceLower
                      .replace(/\s+/g, '')
                      .replace('amazon', 'prime')
                      .replace('primevideo', 'prime')
                      .replace('netflix', 'netflix')
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
            let recommendationSource: 'onboarding' | 'friend' | 'feedback' | 'fallback' = 'fallback';
            
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

            // Merge the AI recommendation with TMDB data
            return {
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
          }
          
          // If no match found, mark as incomplete data and set fallback source
          return {
            ...film,
            source: 'fallback',
            hasCompleteData: false
          };
        } catch (error) {
          console.error(`Error enhancing recommendation for "${film.title}":`, error);
          return {
            ...film,
            source: 'fallback',
            hasCompleteData: false
          }; // Return original film if enhancement fails
        }
      })
    );
    
    // Log performance metrics
    console.log(`AI recommendations enhanced with TMDB data in ${Date.now() - startTime}ms`);
    
    // Run cache cleanup to prevent memory issues
    cleanupCache();
    
    // Filter recommendations to prefer films with complete data and exclude specified films
    console.log(`Original recommendation count: ${enhancedRecommendations.length}`);
    
    // First exclude any film IDs that were specified to be excluded
    let filteredByExclusions = enhancedRecommendations;
    if (preferences.excludeFilmIds && preferences.excludeFilmIds.length > 0) {
      console.log(`Excluding ${preferences.excludeFilmIds.length} film IDs from recommendations`);
      
      // Log a sample of the IDs being excluded for debugging (avoid excessive logging)
      const excludeSample = preferences.excludeFilmIds.slice(0, 5);
      console.log(`Sample of film IDs to exclude: ${excludeSample.join(', ')}${preferences.excludeFilmIds.length > 5 ? ` (and ${preferences.excludeFilmIds.length - 5} more)` : ''}`);
      
      // Create a Set for faster lookups
      const excludeSet = new Set(preferences.excludeFilmIds.map(id => Number(id)));
      
      // Log the current film IDs in the recommendations for debugging
      const beforeExcludeCount = enhancedRecommendations.length;
      
      // More robust exclusion filter that handles type mismatches
      filteredByExclusions = enhancedRecommendations.filter(film => {
        // Convert film ID to number to ensure consistent comparison
        const filmId = Number(film.id);
        
        // Keep the film if it shouldn't be excluded
        return !excludeSet.has(filmId);
      });
      
      // Log the count after exclusion for debugging
      const afterExcludeCount = filteredByExclusions.length;
      const excludedCount = beforeExcludeCount - afterExcludeCount;
      
      console.log(`Excluded ${excludedCount} films, ${afterExcludeCount} films remain`);
      
      // If we excluded films, log a sample of what was excluded
      if (excludedCount > 0) {
        const excludedFilms = enhancedRecommendations.filter(film => filteredByExclusions.every(f => f.id !== film.id));
        const excludedSample = excludedFilms.slice(0, 3).map(film => `"${film.title}" (ID: ${film.id})`);
        console.log(`Sample of excluded films: ${excludedSample.join(', ')}${excludedFilms.length > 3 ? ` (and ${excludedFilms.length - 3} more)` : ''}`);
      }
    }
    
    // Count films with complete data
    const filmsWithCompleteData = filteredByExclusions.filter(film => film.hasCompleteData);
    console.log(`Films with complete data: ${filmsWithCompleteData.length}`);
    
    // If we have at least 4 films with complete data, use those; otherwise use all
    let preliminaryRecommendations = filteredByExclusions;
    if (filmsWithCompleteData.length >= 4) {
      preliminaryRecommendations = filmsWithCompleteData;
      console.log("Using only films with complete data");
    } else {
      console.log("Using all films due to insufficient complete data films");
    }
    
    // Apply runtime filtering if a preference is specified
    let filteredRecommendations = preliminaryRecommendations;
    if (preferences.runtime && preferences.runtime.length > 0) {
      filteredRecommendations = preliminaryRecommendations.filter(film => {
        // Only filter films that have runtime info
        if (typeof film.runtime === 'number') {
          // Check if the film's runtime matches any of the user's selected runtime preferences
          return preferences.runtime!.some(pref => {
            const runtime = film.runtime as number; // Safe assertion since we checked above
            switch (pref) {
              case "short":
                return runtime < 95; // Under 90 mins with 5 mins leeway
              case "medium":
                return runtime >= 85 && runtime <= 125; // 90-120 mins with 5 mins leeway
              case "long":
                return runtime > 115; // Over 120 mins with 5 mins leeway
              default:
                return true;
            }
          });
        }
        return true; // Keep films without runtime info
      });
      
      // If we've filtered out too many films, add back some that are close to the preference
      if (filteredRecommendations.length < 4) {
        const remainingFilms = enhancedRecommendations.filter(film => !filteredRecommendations.includes(film));
        // Sort by how close they are to the preferred runtime range
        remainingFilms.sort((a, b) => {
          if (typeof a.runtime !== 'number') return 1;
          if (typeof b.runtime !== 'number') return -1;
          
          const getDistanceFromPreference = (runtime: number) => {
            // If multiple runtime preferences, find the closest match
            if (preferences.runtime && preferences.runtime.length > 0) {
              return Math.min(...preferences.runtime.map(pref => {
                switch (pref) {
                  case "short":
                    return Math.max(0, runtime - 90);
                  case "medium":
                    return runtime < 90 ? 90 - runtime : runtime > 120 ? runtime - 120 : 0;
                  case "long":
                    return Math.max(0, 120 - runtime);
                  default:
                    return 0;
                }
              }));
            }
            return 0;
          };
          
          return getDistanceFromPreference(a.runtime as number) - getDistanceFromPreference(b.runtime as number);
        });
        
        // Add closest matches until we have at least 4 films, or no more remain
        while (filteredRecommendations.length < 4 && remainingFilms.length > 0) {
          const nextBestFilm = remainingFilms.shift();
          if (nextBestFilm) {
            // Add a note about the runtime mismatch
            nextBestFilm.matchReason = `${nextBestFilm.matchReason} (close to your runtime preference)`;
            filteredRecommendations.push(nextBestFilm);
          }
        }
      }
    }
    
    // Post-process recommendations for streaming services availability
    let processedRecommendations = await postProcessRecommendations(filteredRecommendations, preferences);
    
    // Apply additional filtering to ensure mood preferences are respected
    // Check if we should bypass mood filtering (for "Show More" requests)
    if (preferences._disableMoodFilter !== true) {
      console.log(`Applying additional mood filtering for mood: ${preferences.mood}`);
      processedRecommendations = filterRecommendationsByMood(processedRecommendations, preferences.mood);
    } else {
      console.log("Bypassing mood filtering to provide more diverse recommendations");
    }
    
    // Apply additional filtering to ensure runtime preferences are respected
    if (preferences.runtime && preferences.runtime.length > 0 && preferences._disableRuntimeFilter !== true) {
      // Cast to the expected type for runtime preferences
      const runtimePrefs = preferences.runtime as Array<"short" | "medium" | "long">;
      console.log(`Applying additional runtime filtering for preferences: ${preferences.runtime.join(', ')}`);
      processedRecommendations = filterRecommendationsByRuntime(processedRecommendations, runtimePrefs);
    } else if (preferences._disableRuntimeFilter === true) {
      console.log("Bypassing runtime filtering to provide more diverse recommendations");
    }
    
    return processedRecommendations;
  } catch (error) {
    console.error("Error in enhanced recommendations:", error);
    // Fall back to just returning the AI recommendations
    return await getAIRecommendations(preferences);
  }
}

/**
 * Filters recommendations to ensure they match the user's runtime preferences
 * This provides an additional verification step after AI recommendations
 */
function filterRecommendationsByRuntime(recommendations: Film[], runtimePrefs: Array<"short" | "medium" | "long">): Film[] {
  if (!runtimePrefs || !runtimePrefs.length || recommendations.length === 0) {
    return recommendations;
  }

  console.log(`Applying additional runtime filtering for preferences: ${runtimePrefs.join(', ')}`);
  
  // Define runtime ranges in minutes
  const runtimeRanges: Record<string, [number, number]> = {
    "short": [0, 100],       // Up to 1h40m
    "medium": [80, 140],     // 1h20m to 2h20m
    "long": [130, Infinity]  // 2h10m+
  };
  
  // Filter films with matching runtime
  const matchingRecommendations = recommendations.filter(film => {
    // Skip films without runtime information
    if (!film.runtime) {
      return true; // Keep films without runtime data to maintain diversity
    }
    
    // Check if the film's runtime falls within any of the user's preferred ranges
    return runtimePrefs.some(prefRange => {
      const [min, max] = runtimeRanges[prefRange] || [0, Infinity];
      // At this point, we know film.runtime is defined because of the earlier check
      const runtime = film.runtime as number;
      return runtime >= min && runtime <= max;
    });
  });
  
  console.log(`Found ${matchingRecommendations.length} of ${recommendations.length} films matching runtime preferences`);
  
  // If at least half of recommendations already match, return as is with matching films prioritized
  if (matchingRecommendations.length >= Math.min(3, recommendations.length * 0.5)) {
    // Prioritize matching films but keep all
    return [
      ...matchingRecommendations,
      ...recommendations.filter(film => !matchingRecommendations.includes(film))
    ];
  }
  
  // If too few matches, return all recommendations but boost the matching ones to the top
  console.log(`Too few runtime matches (${matchingRecommendations.length}), keeping all recommendations but prioritizing matches`);
  return [
    ...matchingRecommendations,
    ...recommendations.filter(film => !matchingRecommendations.includes(film))
  ];
}

function filterRecommendationsByMood(recommendations: Film[], mood: string): Film[] {
  if (!mood || recommendations.length === 0) {
    return recommendations;
  }

  console.log(`Applying additional mood filtering for mood: ${mood}`);
  
  // Define genre mappings for different moods
  const moodGenreMappings: Record<string, string[]> = {
    "laugh": ["Comedy", "Adventure", "Romance", "Family"],
    "think": ["Mystery", "Sci-Fi", "Thriller", "Documentary", "Drama"],
    "cry": ["Drama", "Romance", "Biography", "History"],
    "thrill": ["Action", "Horror", "Thriller", "Adventure", "Crime"],
    "escape": ["Fantasy", "Sci-Fi", "Adventure", "Animation"],
    "inspire": ["Biography", "Documentary", "Drama", "History", "Sport"]
  };

  // Get the appropriate genres for the mood
  const targetGenres = moodGenreMappings[mood] || [];
  if (targetGenres.length === 0) {
    console.log(`No genre mapping found for mood: ${mood}`);
    return recommendations;
  }

  // Count how many recommendations have at least one matching genre
  const matchingRecommendations = recommendations.filter(film => 
    film.genres.some(genre => targetGenres.includes(genre))
  );
  
  console.log(`Found ${matchingRecommendations.length} of ${recommendations.length} films matching mood ${mood}`);
  
  // If most recommendations already match, return as is
  if (matchingRecommendations.length >= recommendations.length * 0.7) {
    return recommendations;
  }
  
  // If less than 70% match, sort to prioritize films matching the mood
  // but keep some non-matching films to maintain diversity
  const result = [
    // First, include films that match the mood
    ...matchingRecommendations,
    // Then, add some of the non-matching films at the end (limiting to maintain at least 70% matching)
    ...recommendations
      .filter(film => !matchingRecommendations.includes(film))
      .slice(0, Math.max(1, Math.floor(matchingRecommendations.length * 0.3)))
  ];
  
  console.log(`After mood filtering: ${result.length} films (${matchingRecommendations.length} matching mood)`);
  return result;
}

async function postProcessRecommendations(
  recommendations: Film[], 
  preferences: RecommendationRequest
): Promise<Film[]> {
  // Check if we should bypass streaming filtering (for "Show More" requests)
  if (preferences._bypassStreamingFilter === true) {
    console.log("Bypassing streaming service filtering to provide more diverse recommendations");
    return recommendations;
  }
  
  // If user doesn't have streaming services or country specified, return as is
  if (!preferences.streamingServices || 
      !preferences.streamingServices.length || 
      !preferences.country) {
    return recommendations;
  }
  
  // Find films that are available on user's streaming services
  const availableFilms = recommendations.filter(
    film => film.availableOn && film.availableOn.length > 0
  );
  
  // If we already have films available on user's services, return as is
  if (availableFilms.length > 0) {
    console.log(`Found ${availableFilms.length} films already available on user's streaming services`);
    return recommendations;
  }
  
  console.log("No films available on user's streaming services, searching for alternatives...");
  
  try {
    // Search for popular movies available on the user's streaming services
    // Convert country names to ISO codes that TMDB expects
    let countryCode = preferences.country.toUpperCase();
    
    // Special handling for UK which is "GB" in TMDB
    if (countryCode === 'UNITED KINGDOM' || countryCode === 'UNITED_KINGDOM' || countryCode === 'UK') {
      countryCode = 'GB';
    }
    
    console.log(`Using country code: ${countryCode} for streaming service search`);
    const userServices = preferences.streamingServices;
    
    // Get both popular and top-rated movies from TMDB for better coverage (with caching)
    console.log('Getting popular and top-rated movies from TMDB...');
    let popularMovies, topRatedMovies, nowPlayingMovies;
    
    // Check cache for popular movies
    const popularKey = 'popularMovies:1';
    const cachedPopular = tmdbMovieCache.get(popularKey);
    if (cachedPopular && (Date.now() - cachedPopular.timestamp) < TMDB_CACHE_TTL) {
      console.log('Using cached popular movies');
      popularMovies = cachedPopular.data;
    } else {
      popularMovies = await getPopularMovies(1);
      tmdbMovieCache.set(popularKey, {
        timestamp: Date.now(),
        data: popularMovies
      });
      
      // Clean up cache if needed
      cleanupCache();
    }
    
    // Check cache for top rated movies
    const topRatedKey = 'topRatedMovies:1';
    const cachedTopRated = tmdbMovieCache.get(topRatedKey);
    if (cachedTopRated && (Date.now() - cachedTopRated.timestamp) < TMDB_CACHE_TTL) {
      console.log('Using cached top rated movies');
      topRatedMovies = cachedTopRated.data;
    } else {
      topRatedMovies = await getTopRatedMovies(1);
      tmdbMovieCache.set(topRatedKey, {
        timestamp: Date.now(),
        data: topRatedMovies
      });
      
      // Clean up cache if needed
      cleanupCache();
    }
    
    // Check cache for now playing movies
    const nowPlayingKey = 'nowPlayingMovies:1';
    const cachedNowPlaying = tmdbMovieCache.get(nowPlayingKey);
    if (cachedNowPlaying && (Date.now() - cachedNowPlaying.timestamp) < TMDB_CACHE_TTL) {
      console.log('Using cached now playing movies');
      nowPlayingMovies = cachedNowPlaying.data;
    } else {
      nowPlayingMovies = await getNowPlayingMovies(1);
      tmdbMovieCache.set(nowPlayingKey, {
        timestamp: Date.now(),
        data: nowPlayingMovies
      });
      
      // Clean up cache if needed
      cleanupCache();
    }
    
    // Combine the results for more choices
    const allMovies = {
      results: [
        ...(popularMovies.results || []),
        ...(topRatedMovies.results || []),
        ...(nowPlayingMovies.results || [])
      ]
    };
    
    if (!allMovies.results || allMovies.results.length === 0) {
      console.log('No movies found from TMDB API');
      return recommendations;
    }
    
    console.log(`Checking ${allMovies.results.length} movies for availability on user's services`);
    
    // Find a movie available on the user's services
    for (const movie of allMovies.results) {
      try {
        // Check cache first for providers
        const providersKey = `providers:${movie.id}`;
        let providers;
        
        const cachedProviders = tmdbMovieCache.get(providersKey);
        if (cachedProviders && (Date.now() - cachedProviders.timestamp) < TMDB_CACHE_TTL) {
          // Use cached providers data
          console.log(`Using cached TMDB providers for movie ID: ${movie.id}`);
          providers = cachedProviders.data;
        } else {
          // Fetch providers from API
          providers = await getMovieWatchProviders(movie.id);
          
          // Cache the providers data
          tmdbMovieCache.set(providersKey, {
            timestamp: Date.now(),
            data: providers
          });
          
          // Check if we need to clean up cache
          cleanupCache();
        }
        console.log(`Checking providers for movie ${movie.title} (ID: ${movie.id}) in country ${countryCode}`);
        
        if (!providers.results) {
          console.log(`No provider results available for movie ${movie.title}`);
          continue;
        }
        
        if (!providers.results[countryCode]) {
          console.log(`No providers in ${countryCode} for movie ${movie.title}`);
          continue;
        }
        
        console.log(`Available provider types: ${Object.keys(providers.results[countryCode]).join(', ')}`);
        
        // First check flatrate (subscription)
        if (providers.results[countryCode]?.flatrate) {
          const availableServices = providers.results[countryCode]?.flatrate?.map((p: any) => p.provider_name) || [];
          console.log(`Available flatrate services: ${availableServices.join(', ')}`);
          
          const matchingServices = availableServices.filter(
            (service: string) => userServices.some(
              userService => {
                // Make comparison more flexible by checking both ways
                const serviceLower = service.toLowerCase();
                const userServiceLower = userService.toLowerCase();
                // Check if either is a substring of the other
                return serviceLower.includes(userServiceLower) || userServiceLower.includes(serviceLower);
              }
            )
          );
          
          if (matchingServices.length > 0) {
            // We found a match! Convert to our Film format
            const popularFilm = await convertTMDBMovieToFilm(movie);
            
            // Skip if this film is in the exclude list
            if (preferences.excludeFilmIds && 
                preferences.excludeFilmIds.includes(popularFilm.id)) {
              console.log(`Skipping excluded film: ${popularFilm.title} (ID: ${popularFilm.id})`);
              continue;
            }
            
            // Add this to the beginning of our recommendations
            popularFilm.matchReason = "Popular on your streaming services";
            popularFilm.matchPercentage = 95;
            popularFilm.availableOn = matchingServices;
            popularFilm.hasStreamingData = true;
            popularFilm.hasCompleteData = !!(popularFilm.posterUrl && popularFilm.runtime);
            
            console.log(`Added popular film "${popularFilm.title}" available on streaming services: ${matchingServices.join(', ')}`);
            
            // Add to the beginning of the array
            recommendations.unshift(popularFilm);
            
            // Only add one film to avoid overwhelming the original recommendations
            return recommendations;
          }
        }
        
        // If no flatrate matches, check buy options as a fallback
        if (providers.results[countryCode]?.buy) {
          // We won't add buy options as "available" but we'll log them for debugging
          const buyServices = providers.results[countryCode]?.buy?.map((p: any) => p.provider_name) || [];
          console.log(`Buy services available (not adding): ${buyServices.join(', ')}`);
        }
      } catch (error) {
        console.error(`Error checking streaming for movie ${movie.title}:`, error);
      }
    }
    
    console.log('No movies found available on user streaming services');
    return recommendations;
  } catch (error) {
    console.error("Error in postProcessRecommendations:", error);
    return recommendations;
  }
}