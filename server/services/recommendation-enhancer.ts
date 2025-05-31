import { Film, RecommendationRequest } from "@shared/schema";
import { getAIRecommendations } from "./openai";
import { 
  searchMovies, 
  getMovieWatchProviders, 
  convertTMDBMovieToFilm,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getPosterUrl
} from "./tmdb";
import { 
  getUserFilmFeedback, 
  extractPreferenceWeights,
  applyFeedbackWeights 
} from './firestore-feedback-reader';

/**
 * Map user country input to TMDB country codes
 */
function mapUserCountryToTMDB(userCountry: string): string {
  const countryMapping: Record<string, string> = {
    // Common user inputs to TMDB codes
    'uk': 'GB',
    'gb': 'GB',
    'united kingdom': 'GB',
    'britain': 'GB',
    'england': 'GB',
    'scotland': 'GB',
    'wales': 'GB',
    'us': 'US',
    'usa': 'US',
    'united states': 'US',
    'america': 'US',
    'canada': 'CA',
    'france': 'FR',
    'germany': 'DE',
    'spain': 'ES',
    'italy': 'IT',
    'australia': 'AU',
    'japan': 'JP',
    'south korea': 'KR',
    'korea': 'KR',
    'netherlands': 'NL',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'brazil': 'BR',
    'mexico': 'MX',
    'argentina': 'AR',
    'india': 'IN',
    'china': 'CN',
    'russia': 'RU'
  };

  const normalizedInput = userCountry.toLowerCase().trim();
  
  // Check if it's already a valid TMDB code (2-letter uppercase)
  if (userCountry.length === 2 && userCountry === userCountry.toUpperCase()) {
    return userCountry;
  }
  
  // Look up in mapping
  const mappedCode = countryMapping[normalizedInput];
  if (mappedCode) {
    return mappedCode;
  }
  
  // Fallback: convert to uppercase (assuming it's already a valid code)
  return userCountry.toUpperCase();
}

// Create a cache for movie data to avoid redundant API calls
const tmdbMovieCache = new Map<string, any>();
const TMDB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Clear cache on startup to ensure fresh streaming data after fixes
tmdbMovieCache.clear();
console.log('🎬 CACHE CLEARED: Starting with fresh TMDB cache to ensure proper streaming data');

// Force bypass cache for testing (remove this line after streaming is confirmed working)
const FORCE_BYPASS_CACHE = true;
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
      
      // ALWAYS process streaming availability for current user, regardless of cache
      console.log(`🎬 PROCESSING STREAMING for "${film.title}" - User: ${preferences.country?.toUpperCase() || 'NO_COUNTRY'}, Services: ${preferences.streamingServices?.join(', ') || 'NONE'}`);
      
      // Check if we have this film in cache
      if (false && tmdbMovieCache.has(cacheKey)) {
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
          
          // CRITICAL FIX: Re-process streaming availability for cached films
          // The cached film might not have streaming data for the current user's services
          let availableOn: string[] = [];
          
          if (cachedFilm.availableStreamingByCountry && preferences.streamingServices && preferences.country) {
            const tmdbCountryCode = mapUserCountryToTMDB(preferences.country);
            const countryServices = cachedFilm.availableStreamingByCountry[tmdbCountryCode] || [];
            
            console.log(`🎬 STREAMING DEBUG for "${cachedFilm.title}" (CACHED):`, {
              country: preferences.country,
              tmdbCountryCode: tmdbCountryCode,
              userServices: preferences.streamingServices,
              tmdbServices: countryServices
            });
            
            // Filter services to only those the user has
            availableOn = countryServices.filter((service: string) =>
              preferences.streamingServices?.some(userService => {
                // Use the same comprehensive mapping as fresh processing
                const tmdbToInternalMapping: Record<string, string[]> = {
                  'netflix': ['netflix'],
                  'amazon video': ['amazonprime', 'amazon', 'amazon prime'],
                  'amazon prime video': ['amazonprime', 'amazon', 'amazon prime'],
                  'prime video': ['amazonprime', 'amazon', 'amazon prime'],
                  'disney+': ['disneyplus', 'disney'],
                  'disney plus': ['disneyplus', 'disney'],
                  'hbo max': ['hbo', 'hbomax'],
                  'hbo': ['hbo', 'hbomax'],
                  'paramount+': ['paramountplus', 'paramount'],
                  'paramount plus': ['paramountplus', 'paramount'],
                  'apple tv+': ['appletvplus', 'apple'],
                  'apple tv': ['appletvplus', 'apple'],
                  'hulu': ['hulu'],
                  'bbc iplayer': ['bbciplayer', 'bbc'],
                  'iplayer': ['bbciplayer', 'bbc'],
                  'mubi': ['mubi'],
                  'sky go': ['sky', 'skygo'],
                  'now tv': ['nowtv', 'now'],
                  'now tv cinema': ['nowtv', 'now']
                };
                
                const serviceLower = service.toLowerCase();
                const userServiceLower = userService.toLowerCase();
                
                // Check comprehensive mapping
                for (const [tmdbName, internalNames] of Object.entries(tmdbToInternalMapping)) {
                  if (serviceLower.includes(tmdbName) || tmdbName.includes(serviceLower)) {
                    if (internalNames.includes(userServiceLower)) {
                      return true;
                    }
                  }
                }
                
                // Fallback matching
                return serviceLower === userServiceLower || 
                       serviceLower.includes(userServiceLower) || 
                       userServiceLower.includes(serviceLower);
              })
            );
            
            console.log(`🎬 STREAMING RESULT for "${cachedFilm.title}" (CACHED):`, {
              availableOnCount: availableOn.length,
              availableServices: availableOn
            });
          }

          return {
            ...cachedFilm,
            availableOn, // Update with current user's available services
            hasStreamingData: !!(cachedFilm.availableStreamingByCountry && Object.keys(cachedFilm.availableStreamingByCountry).length > 0),
            source
          };
        }
        
        // If cache has expired, remove it
        tmdbMovieCache.delete(cacheKey);
      }
      
      // Search for the movie in TMDB with separate title and year parameters
      console.log(`Searching TMDB for film: "${film.title}" (${film.year})`);
      const searchResults = await searchMovies(film.title, 1, film.year);
      
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        // Use the first result as our best match
        const tmdbMovie = searchResults[0];
        console.log(`Using TMDB movie: ${tmdbMovie.title} (${tmdbMovie.release_date?.substring(0,4) || 'N/A'}) [ID: ${tmdbMovie.id}]`);
        console.log(`🎬 CACHE BYPASS: Converting TMDB movie with fresh streaming data for "${tmdbMovie.title}"`);
        const tmdbFilm = await convertTMDBMovieToFilm(tmdbMovie);
        
        // Get streaming services where this film is available (depends on user country)
        let availableOn: string[] = [];
        
        if (preferences.streamingServices && preferences.streamingServices.length > 0 && 
            preferences.country && tmdbFilm.availableStreamingByCountry) {
          // Map user territory to TMDB country code
          const tmdbCountryCode = mapUserCountryToTMDB(preferences.country);
          // Get available services in user's country
          const countrySvcs = tmdbFilm.availableStreamingByCountry[tmdbCountryCode] || [];
          console.log(`🎬 STREAMING DEBUG for "${film.title}":`, {
            userCountry: preferences.country,
            tmdbCountryCode: tmdbCountryCode,
            userServices: preferences.streamingServices,
            tmdbServices: countrySvcs
          });
          
          // Filter to only include services the user has selected
          availableOn = countrySvcs.filter((service: string) => 
            preferences.streamingServices?.some(userService => {
              // Create comprehensive mapping between TMDB provider names and our internal service names
              const tmdbToInternalMapping: Record<string, string[]> = {
                'netflix': ['netflix'],
                'amazon video': ['amazonprime', 'amazon', 'amazon prime'],
                'amazon prime video': ['amazonprime', 'amazon', 'amazon prime'],
                'prime video': ['amazonprime', 'amazon', 'amazon prime'],
                'disney+': ['disneyplus', 'disney'],
                'disney plus': ['disneyplus', 'disney'],
                'hbo max': ['hbo', 'hbomax'],
                'hbo': ['hbo', 'hbomax'],
                'paramount+': ['paramountplus', 'paramount'],
                'paramount plus': ['paramountplus', 'paramount'],
                'apple tv+': ['appletvplus', 'apple'],
                'apple tv': ['appletvplus', 'apple'],
                'hulu': ['hulu'],
                'bbc iplayer': ['bbciplayer', 'bbc'],
                'iplayer': ['bbciplayer', 'bbc'],
                'mubi': ['mubi'],
                'sky go': ['sky', 'skygo'],
                'now tv': ['nowtv', 'now'],
                'now tv cinema': ['nowtv', 'now'],
                'itvx': ['itvx', 'itv'],
                'bbc iplayer': ['bbciplayer', 'bbc', 'iplayer'],
                'channel 4': ['channel4', 'c4'],
                'all 4': ['channel4', 'c4', 'all4'],
                'my5': ['my5', 'channel5'],
                'crunchyroll': ['crunchyroll'],
                'discovery+': ['discoveryplus', 'discovery'],
                'hayu': ['hayu'],
                'britbox': ['britbox']
              };
              
              const serviceLower = service.toLowerCase();
              const userServiceLower = userService.toLowerCase();
              
              // Check if TMDB service name maps to any of our internal service names
              for (const [tmdbName, internalNames] of Object.entries(tmdbToInternalMapping)) {
                if (serviceLower.includes(tmdbName) || tmdbName.includes(serviceLower)) {
                  if (internalNames.includes(userServiceLower)) {
                    return true;
                  }
                }
              }
              
              // Fallback: direct string matching for any services not in our mapping
              return serviceLower === userServiceLower || 
                     serviceLower.includes(userServiceLower) || 
                     userServiceLower.includes(serviceLower);
            })
          );
          
          console.log(`🎬 STREAMING RESULT for "${film.title}":`, {
            availableOnCount: availableOn.length,
            availableServices: availableOn
          });
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
        
        // Define the return Film object with correct typing
        const enhancedFilm: Film = {
          ...film,
          tmdbId: tmdbMovie.id,
          // Fix 1: Always use string for poster URL (empty string fallback)
          posterUrl: tmdbMovie.poster_path ? getPosterUrl(tmdbMovie.poster_path) : (film.posterUrl || ''),
          // Include streaming availability
          availableOn,
          // Include TMDB metadata safely from the converted data
          runtime: tmdbFilm.runtime || undefined,
          voteAverage: tmdbMovie.vote_average || undefined,
          originalLanguage: tmdbMovie.original_language || undefined,
          releaseDate: tmdbMovie.release_date || undefined,
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
          hasCompleteData: true
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
      return {
        ...film,
        source: 'fallback' as 'fallback',
        hasCompleteData: false
      };
    } catch (error) {
      console.error(`Error enhancing recommendation:`, error);
      return {
        ...film,
        source: 'fallback' as 'fallback',
        hasCompleteData: false
      }; // Return original film if enhancement fails
    }
  });

  // Wait for all enhancements to complete
  const enhancedRecommendations = await Promise.all(enhancedRecommendationsPromises);
  
  // CRITICAL: Process streaming availability for every film regardless of cache source
  console.log(`🎬 STREAMING PROCESSOR: Processing ${enhancedRecommendations.length} films for user streaming availability`);
  const streamingProcessedRecommendations = enhancedRecommendations.map(film => {
    let availableOn: string[] = [];
    
    console.log(`🎬 STREAMING PROCESSOR for "${film.title}":`, {
      hasStreamingData: !!film.availableStreamingByCountry,
      userCountry: preferences.country,
      userServices: preferences.streamingServices,
      filmType: film.source || 'unknown'
    });
    
    if (film.availableStreamingByCountry && preferences.streamingServices && preferences.country) {
      const tmdbCountryCode = mapUserCountryToTMDB(preferences.country);
      const countryServices = film.availableStreamingByCountry[tmdbCountryCode] || [];
      
      console.log(`🎬 RAW TMDB SERVICES for "${film.title}":`, {
        country: tmdbCountryCode,
        tmdbServices: countryServices,
        tmdbCount: countryServices.length,
        userHasServices: preferences.streamingServices
      });
      
      // Log each service matching attempt for debugging
      countryServices.forEach((service: string) => {
        const matchFound = preferences.streamingServices?.some(userService => {
          const serviceLower = service.toLowerCase();
          const userServiceLower = userService.toLowerCase();
          
          // Test comprehensive mapping
          for (const [tmdbName, internalNames] of Object.entries({
            'netflix': ['netflix'],
            'amazon video': ['amazonprime', 'amazon', 'amazon prime'],
            'amazon prime video': ['amazonprime', 'amazon', 'amazon prime'],
            'prime video': ['amazonprime', 'amazon', 'amazon prime'],
            'disney+': ['disneyplus', 'disney'],
            'disney plus': ['disneyplus', 'disney']
          })) {
            if (serviceLower.includes(tmdbName) || tmdbName.includes(serviceLower)) {
              if (internalNames.includes(userServiceLower)) {
                return true;
              }
            }
          }
          return false;
        });
        console.log(`🔍 SERVICE MATCH TEST: "${service}" → Match found: ${matchFound}`);
      });
      
      // Apply comprehensive service name mapping
      availableOn = countryServices.filter((service: string) =>
        preferences.streamingServices?.some(userService => {
          const serviceLower = service.toLowerCase();
          const userServiceLower = userService.toLowerCase();
          
          // Enhanced mapping that includes rental/purchase platforms
          const serviceNameMapping = {
            'netflix': ['netflix'],
            'amazon video': ['amazonprime', 'amazon', 'amazon prime'],
            'amazon prime video': ['amazonprime', 'amazon', 'amazon prime'],
            'prime video': ['amazonprime', 'amazon', 'amazon prime'],
            'disney+': ['disneyplus', 'disney'],
            'disney plus': ['disneyplus', 'disney'],
            'apple tv+': ['appletv', 'apple'],
            'apple tv': ['appletv', 'apple'],
            'hbo max': ['hbomax', 'hbo'],
            'paramount+': ['paramountplus', 'paramount'],
            'paramount plus': ['paramountplus', 'paramount'],
            'peacock': ['peacock'],
            'hulu': ['hulu'],
            'bbc iplayer': ['bbciplayer', 'bbc', 'iplayer'],
            'iplayer': ['bbciplayer', 'bbc', 'iplayer'],
            'mubi': ['mubi'],
            'sky go': ['sky', 'skygo'],
            'now tv': ['nowtv', 'now'],
            'now tv cinema': ['nowtv', 'now'],
            'itvx': ['itvx', 'itv'],
            'channel 4': ['channel4', 'c4'],
            'all 4': ['channel4', 'c4', 'all4'],
            'my5': ['my5', 'channel5'],
            'crunchyroll': ['crunchyroll'],
            'discovery+': ['discoveryplus', 'discovery'],
            'hayu': ['hayu'],
            'britbox': ['britbox'],
            // Digital rental/purchase platforms - match to ANY user services (since they're widely available)
            'rakuten tv': ['amazonprime', 'amazon', 'amazon prime', 'appletv', 'apple', 'netflix', 'disneyplus', 'disney'],
            'google play movies': ['amazonprime', 'amazon', 'amazon prime', 'appletv', 'apple', 'netflix', 'disneyplus', 'disney'],
            'youtube': ['amazonprime', 'amazon', 'amazon prime', 'appletv', 'apple', 'netflix', 'disneyplus', 'disney'],
            'microsoft store': ['amazonprime', 'amazon', 'amazon prime', 'appletv', 'apple', 'netflix', 'disneyplus', 'disney'],
            'sky store': ['sky', 'skystore', 'nowtv', 'now', 'amazonprime', 'amazon', 'amazon prime'],
            'vudu': ['amazonprime', 'amazon', 'amazon prime', 'appletv', 'apple'],
            'itunes': ['appletv', 'apple', 'amazonprime', 'amazon', 'amazon prime']
          };
          
          // Check for matches using the mapping
          for (const [tmdbName, internalNames] of Object.entries(serviceNameMapping)) {
            if (serviceLower.includes(tmdbName) || tmdbName.includes(serviceLower)) {
              if (internalNames.includes(userServiceLower)) {
                console.log(`✅ MATCHED: "${service}" (TMDB) → "${userService}" (User) via ${tmdbName}`);
                return true;
              }
            }
          }
          
          return false;
        })
      );
      
      console.log(`🎬 FINAL RESULT for "${film.title}":`, {
        availableOnCount: availableOn.length,
        availableServices: availableOn,
        willShowBadges: availableOn.length > 0
      });
    } else {
      const missingItems = [];
      if (!film.availableStreamingByCountry) missingItems.push('streaming data');
      if (!preferences.streamingServices) missingItems.push('user services');
      if (!preferences.country) missingItems.push('user country');
      
      console.log(`🎬 NO STREAMING PROCESSING for "${film.title}" - Missing: ${missingItems.join(', ')}`);
    }
    
    return {
      ...film,
      availableOn, // Always update with processed availability
      hasStreamingData: !!(film.availableStreamingByCountry && Object.keys(film.availableStreamingByCountry).length > 0) // Set the flag the frontend expects
    };
  });
  
  // Filter recommendations based on runtime preferences if specified  
  let filteredRecommendations = streamingProcessedRecommendations;
  
  if (preferences.runtime && preferences.runtime.length > 0) {
    filteredRecommendations = filterRecommendationsByRuntime(
      streamingProcessedRecommendations,
      preferences.runtime as Array<"short" | "medium" | "long">
    );
    console.log(`Filtered ${streamingProcessedRecommendations.length} recommendations to ${filteredRecommendations.length} based on runtime preferences`);
  }
  
  // Report how long this took (for performance monitoring)
  const endTime = Date.now();
  console.log(`Enhanced recommendations generated in ${endTime - startTime}ms`);
  

  
  return filteredRecommendations;
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