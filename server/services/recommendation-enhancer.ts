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
export async function getEnhancedRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  try {
    // Performance optimization: start timestamp
    const startTime = Date.now();
    
    // First get the AI recommendations
    const aiRecommendations = await getAIRecommendations(preferences);
    
    console.log(`AI recommendations retrieved in ${Date.now() - startTime}ms`);
    
    // Enhance each recommendation with TMDB data - use Promise.all for parallel processing
    const enhancedRecommendations = await Promise.all(
      aiRecommendations.map(async (film) => {
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
                    // Make comparison more flexible by checking both ways
                    const serviceLower = service.toLowerCase();
                    const userServiceLower = userService.toLowerCase();
                    // Check if either is a substring of the other
                    return serviceLower.includes(userServiceLower) || userServiceLower.includes(serviceLower);
                  }
                )
              );
            }
            
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
              // Include full streaming data for all countries
              availableStreamingByCountry: tmdbFilm.availableStreamingByCountry,
              // Add special flags to help with post-processing
              hasStreamingData: true,
              hasCompleteData: !!(tmdbFilm.posterUrl && tmdbFilm.runtime) // Flag to indicate if film has all required data
            };
          }
          
          // If no match found, mark as incomplete data and return
          return {
            ...film,
            hasCompleteData: false
          };
        } catch (error) {
          console.error(`Error enhancing recommendation for "${film.title}":`, error);
          return {
            ...film,
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
      filteredByExclusions = enhancedRecommendations.filter(film => 
        !preferences.excludeFilmIds?.includes(film.id)
      );
      console.log(`After exclusions: ${filteredByExclusions.length} films remain`);
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
    
    // Post-process recommendations to ensure at least one film is available on user's streaming services
    const finalRecommendations = await postProcessRecommendations(filteredRecommendations, preferences);
    
    return finalRecommendations;
  } catch (error) {
    console.error("Error in enhanced recommendations:", error);
    // Fall back to just returning the AI recommendations
    return await getAIRecommendations(preferences);
  }
}

/**
 * Post-process recommendations to ensure we have at least one film available on user's streaming services
 */
async function postProcessRecommendations(
  recommendations: Film[], 
  preferences: RecommendationRequest
): Promise<Film[]> {
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