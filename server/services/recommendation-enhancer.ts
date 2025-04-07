import { Film, RecommendationRequest } from "@shared/schema";
import { getAIRecommendations } from "./openai";
import { searchMovies, getMovieWatchProviders, convertTMDBMovieToFilm } from "./tmdb";

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
              availableStreamingByCountry: tmdbFilm.availableStreamingByCountry
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
    
    return enhancedRecommendations;
  } catch (error) {
    console.error("Error in enhanced recommendations:", error);
    // Fall back to just returning the AI recommendations
    return await getAIRecommendations(preferences);
  }
}