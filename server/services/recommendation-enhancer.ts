import { Film, RecommendationRequest } from "@shared/schema";
import { getAIRecommendations } from "./openai";
import { 
  searchMovies, 
  getMovieWatchProviders, 
  convertTMDBMovieToFilm,
  getPopularMovies
} from "./tmdb";

/**
 * Enhanced recommendation service that combines AI recommendations with TMDB data
 * for accurate streaming service availability
 */
export async function getEnhancedRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  try {
    // First get the AI recommendations
    const aiRecommendations = await getAIRecommendations(preferences);
    
    // Enhance each recommendation with TMDB data
    const enhancedRecommendations = await Promise.all(
      aiRecommendations.map(async (film) => {
        try {
          // Create a more precise search query with both title and year
          let searchQuery = `${film.title} ${film.year}`;
          
          // Search for the film in TMDB database
          let searchResults = await searchMovies(searchQuery, 1);
          
          // If no results, try with just the title (sometimes year can be inaccurate)
          if (!searchResults.results || searchResults.results.length === 0) {
            searchResults = await searchMovies(film.title, 1);
          }
          
          // If we found a match
          if (searchResults.results && searchResults.results.length > 0) {
            // Sort results by relevance - prioritize closest year match if we have multiple results
            const sortedResults = searchResults.results
              .sort((a, b) => {
                if (a.release_date && b.release_date) {
                  const yearA = parseInt(a.release_date.split('-')[0]);
                  const yearB = parseInt(b.release_date.split('-')[0]);
                  return Math.abs(yearA - film.year) - Math.abs(yearB - film.year);
                }
                return 0;
              });
            
            // Get the closest match after sorting
            const tmdbMovie = sortedResults[0];
            
            // Get streaming providers for this movie
            const watchProviders = await getMovieWatchProviders(tmdbMovie.id);
            
            // Convert to our Film format with streaming data
            const tmdbFilm = await convertTMDBMovieToFilm(tmdbMovie);
            
            // Filter streaming services to only show the ones the user has access to
            const countryCode = preferences.country?.toUpperCase() || 'US';
            let availableOn: string[] = [];
            
            // If the user has specified streaming services and the movie is available in their country
            if (preferences.streamingServices && 
                preferences.streamingServices.length > 0 &&
                tmdbFilm.availableStreamingByCountry &&
                tmdbFilm.availableStreamingByCountry[countryCode]) {
              
              // Filter to only include services the user has
              availableOn = tmdbFilm.availableStreamingByCountry[countryCode].filter(
                service => preferences.streamingServices!.some(
                  userService => service.toLowerCase().includes(userService.toLowerCase())
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
              // Add a special flag to help with post-processing
              hasStreamingData: true
            };
          }
          
          // If no match found, return the original film
          return film;
        } catch (error) {
          console.error(`Error enhancing recommendation for "${film.title}":`, error);
          return film; // Return original film if enhancement fails
        }
      })
    );
    
    // Post-process recommendations to ensure at least one film is available on user's streaming services
    const finalRecommendations = await postProcessRecommendations(enhancedRecommendations, preferences);
    
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
    const countryCode = preferences.country.toUpperCase();
    const userServices = preferences.streamingServices;
    
    // Get popular movies from TMDB
    const popularMovies = await getPopularMovies(1);
    
    if (!popularMovies.results || popularMovies.results.length === 0) {
      return recommendations;
    }
    
    // Find a movie available on the user's services
    for (const movie of popularMovies.results) {
      const providers = await getMovieWatchProviders(movie.id);
      
      if (providers.results && 
          providers.results[countryCode] && 
          providers.results[countryCode].flatrate) {
        
        const availableServices = providers.results[countryCode].flatrate.map(p => p.provider_name);
        
        const matchingServices = availableServices.filter(
          service => userServices.some(
            userService => service.toLowerCase().includes(userService.toLowerCase())
          )
        );
        
        if (matchingServices.length > 0) {
          // We found a match! Convert to our Film format
          const popularFilm = await convertTMDBMovieToFilm(movie);
          
          // Add this to the beginning of our recommendations
          popularFilm.matchReason = "Popular on your streaming services";
          popularFilm.matchPercentage = 95;
          popularFilm.availableOn = matchingServices;
          
          console.log(`Added popular film "${popularFilm.title}" available on user's services`);
          
          // Add to the beginning of the array
          recommendations.unshift(popularFilm);
          
          // Only add one film to avoid overwhelming the original recommendations
          break;
        }
      }
    }
    
    return recommendations;
  } catch (error) {
    console.error("Error in postProcessRecommendations:", error);
    return recommendations;
  }
}