/**
 * TMDB (The Movie Database) API Service
 * 
 * This service handles all interactions with the TMDB API, including:
 * - Searching for movies by title
 * - Getting detailed movie information
 * - Getting movie credits (cast & crew)
 * - Getting movie images
 * - Getting streaming availability information
 */

import { Film } from "@shared/schema";

// API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Poster sizes: "w92", "w154", "w185", "w342", "w500", "w780", "original"
const POSTER_SIZE = 'w500';
// Backdrop sizes: "w300", "w780", "w1280", "original"
const BACKDROP_SIZE = 'w1280';

// Image URL helpers - FIXED to always return string (not null)
export const getPosterUrl = (posterPath: string): string => 
  posterPath ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${posterPath}` : '';

export const getBackdropUrl = (backdropPath: string): string => 
  backdropPath ? `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZE}${backdropPath}` : '';

// Basic types for TMDB API responses
interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
}

interface TMDBMovieDetails extends TMDBMovie {
  belongs_to_collection: any | null;
  budget: number;
  genres: { id: number; name: string }[];
  homepage: string | null;
  imdb_id: string | null;
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  revenue: number;
  runtime: number | null;
  spoken_languages: { iso_639_1: string; name: string }[];
  status: string;
  tagline: string | null;
  videos: {
    results: {
      id: string;
      key: string;
      name: string;
      site: string;
      size: number;
      type: string;
    }[];
  };
}

interface TMDBCredits {
  id: number;
  cast: {
    adult: boolean;
    gender: number | null;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string | null;
    cast_id: number;
    character: string;
    credit_id: string;
    order: number;
  }[];
  crew: {
    adult: boolean;
    gender: number | null;
    id: number;
    known_for_department: string;
    name: string;
    original_name: string;
    popularity: number;
    profile_path: string | null;
    credit_id: string;
    department: string;
    job: string;
  }[];
}

interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBWatchProviders {
  id: number;
  results: {
    [countryCode: string]: {
      link: string;
      rent?: {
        logo_path: string;
        provider_id: number;
        provider_name: string;
        display_priority: number;
      }[];
      buy?: {
        logo_path: string;
        provider_id: number;
        provider_name: string;
        display_priority: number;
      }[];
      flatrate?: {
        logo_path: string;
        provider_id: number;
        provider_name: string;
        display_priority: number;
      }[];
    };
  };
}

/**
 * Search for movies by title and optional year
 */
export async function searchMovies(title: string, page: number = 1, year?: number): Promise<TMDBMovie[]> {
  // Make sure we have an API key
  if (!TMDB_API_KEY) {
    console.error('TMDB API key is missing');
    return [];
  }
  
  // Build the search query with just the title (not concatenated with year)
  let url = `${TMDB_API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&page=${page}&include_adult=false`;
  
  // Only add year as a separate parameter if provided
  if (year && year > 1900) {
    url += `&year=${year}`;
  }
  
  try {
    // Debug log with masked API key
    const debugUrl = url.replace(/api_key=[^&]+/, 'api_key=***');
    console.log(`TMDB request URL: ${debugUrl}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API error (${response.status}): ${errorText}`);
      
      // If we included a year and got no results, try again without the year
      if (year && year > 1900) {
        console.log(`Retrying TMDB search for "${title}" without year filter`);
        return searchMovies(title, page); // Recursive call without year
      }
      
      return []; // Return empty rather than throwing
    }
    
    const data = await response.json() as TMDBSearchResponse;
    
    if (!data.results || data.results.length === 0) {
      console.log(`No TMDB results found for "${title}"${year ? ` (${year})` : ''}`);
      
      // If we included a year and got no results, try again without the year
      if (year && year > 1900) {
        console.log(`Retrying TMDB search for "${title}" without year filter`);
        return searchMovies(title, page); // Recursive call without year
      }
      
      return [];
    }
    
    console.log(`Found ${data.results.length} TMDB results for "${title}"${year ? ` (${year})` : ''}`);
    
    if (data.results.length > 0) {
      console.log(`First match: "${data.results[0].title}" (${data.results[0].release_date?.substring(0,4) || 'N/A'})`);
    }
    
    // Always return the results array (or empty array if missing)
    return data.results || [];
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Get detailed information about a movie by ID
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
  const url = `${TMDB_API_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as TMDBMovieDetails;
  } catch (error) {
    console.error(`Error getting movie details for ID ${movieId}:`, error);
    throw error;
  }
}

/**
 * Get credits (cast & crew) for a movie by ID
 */
export async function getMovieCredits(movieId: number): Promise<TMDBCredits> {
  const url = `${TMDB_API_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as TMDBCredits;
  } catch (error) {
    console.error(`Error getting movie credits for ID ${movieId}:`, error);
    throw error;
  }
}

/**
 * Get streaming provider information for a movie
 */
export async function getMovieWatchProviders(movieId: number): Promise<TMDBWatchProviders> {
  const url = `${TMDB_API_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as TMDBWatchProviders;
  } catch (error) {
    console.error(`Error getting watch providers for ID ${movieId}:`, error);
    throw error;
  }
}

/**
 * Get a list of streaming providers supported by TMDB
 */
export async function getStreamingProviders(): Promise<any> {
  const url = `${TMDB_API_BASE_URL}/watch/providers/movie?api_key=${TMDB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting streaming providers:', error);
    throw error;
  }
}

/**
 * Get popular movies
 */
export async function getPopularMovies(page: number = 1): Promise<TMDBSearchResponse> {
  const url = `${TMDB_API_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as TMDBSearchResponse;
  } catch (error) {
    console.error('Error getting popular movies:', error);
    throw error;
  }
}

/**
 * Get now playing movies
 */
export async function getNowPlayingMovies(page: number = 1): Promise<TMDBSearchResponse> {
  const url = `${TMDB_API_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&page=${page}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as TMDBSearchResponse;
  } catch (error) {
    console.error('Error getting now playing movies:', error);
    throw error;
  }
}

/**
 * Get top rated movies
 */
export async function getTopRatedMovies(page: number = 1): Promise<TMDBSearchResponse> {
  const url = `${TMDB_API_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as TMDBSearchResponse;
  } catch (error) {
    console.error('Error getting top rated movies:', error);
    throw error;
  }
}

/**
 * Get a list of movie genres
 */
export async function getMovieGenres(): Promise<{ genres: { id: number; name: string }[] }> {
  const url = `${TMDB_API_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    return await response.json() as { genres: { id: number; name: string }[] };
  } catch (error) {
    console.error('Error getting movie genres:', error);
    throw error;
  }
}

/**
 * Convert TMDB movie data to our Film type
 */
export async function convertTMDBMovieToFilm(movie: TMDBMovie | TMDBMovieDetails): Promise<Film> {
  try {
    let movieDetails: TMDBMovieDetails;
    let credits: TMDBCredits;
    let watchProviders: TMDBWatchProviders;
    
    // If we have a TMDBMovie, fetch the details
    if (!('runtime' in movie)) {
      movieDetails = await getMovieDetails(movie.id);
    } else {
      movieDetails = movie as TMDBMovieDetails;
    }
    
    // Get credits and watch providers
    try {
      credits = await getMovieCredits(movie.id);
    } catch (error) {
      console.error(`Error getting credits for ${movie.title}:`, error);
      credits = { id: movie.id, cast: [], crew: [] };
    }
    
    try {
      watchProviders = await getMovieWatchProviders(movie.id);
    } catch (error) {
      console.error(`Error getting watch providers for ${movie.title}:`, error);
      watchProviders = { id: movie.id, results: {} };
    }
    
    // Extract directors and primary cast
    const directors = credits.crew
      .filter(person => person.job === 'Director')
      .map(director => director.name);
    
    const cast = credits.cast
      .slice(0, 5) // Take top 5 actors
      .map(actor => actor.name);
    
    // Extract genres
    const genres = movieDetails.genres.map(genre => genre.name);
    
    // Extract streaming services by country
    const availableStreamingByCountry: Record<string, string[]> = {};
    
    Object.entries(watchProviders.results || {}).forEach(([countryCode, providers]) => {
      const streamingServices = providers.flatrate || [];
      availableStreamingByCountry[countryCode.toLowerCase()] = streamingServices.map(service => service.provider_name);
    });
    
    // Determine if this is an indie film based on various factors
    const isIndie = isIndieFilm(movieDetails);
    
    // Return our standardized Film object
    return {
      id: movie.id,
      tmdbId: movie.id,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : 0,
      overview: movie.overview,
      // FIXED: Always use string for posterUrl (empty string if null)
      posterUrl: movie.poster_path ? getPosterUrl(movie.poster_path) : '',
      backdropUrl: movie.backdrop_path ? getBackdropUrl(movie.backdrop_path) : '',
      runtime: movieDetails.runtime || undefined,
      directors,
      cast,
      genres,
      originalLanguage: movie.original_language,
      voteAverage: movie.vote_average,
      releaseDate: movie.release_date,
      isIndie,
      availableStreamingByCountry,
      matchPercentage: 0, // To be set by recommendation engine
      matchReason: '', // To be set by recommendation engine
      hasCompleteData: true // This is a full data fetch from TMDB
    };
  } catch (error) {
    console.error(`Error converting TMDB movie to Film:`, error);
    
    // Return a minimal Film object with what we have
    return {
      id: movie.id,
      tmdbId: movie.id,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : 0,
      overview: movie.overview,
      posterUrl: movie.poster_path ? getPosterUrl(movie.poster_path) : '',
      genres: [],
      matchPercentage: 0,
      matchReason: '',
      hasCompleteData: false
    };
  }
}

/**
 * Determine if a film is indie based on various factors
 */
function isIndieFilm(movie: TMDBMovieDetails): boolean {
  // Indie films typically have lower budgets
  if (movie.budget && movie.budget < 10000000) { // Under $10M is often indie
    return true;
  }
  
  // Indie films often have fewer production companies
  if (movie.production_companies.length <= 2) {
    return true;
  }
  
  // Check if any of the production companies are major studios
  const majorStudios = [
    'Warner Bros', 'Universal', 'Paramount', 'Walt Disney', 'Disney',
    'Columbia', 'Sony', '20th Century', 'MGM', 'Lionsgate'
  ];
  
  const isMajorStudio = movie.production_companies.some(company => 
    majorStudios.some(studio => company.name.includes(studio))
  );
  
  // If no major studios are involved, more likely to be indie
  if (!isMajorStudio) {
    return true;
  }
  
  return false;
}

/**
 * Test function to verify TMDB API connectivity
 */
export async function testTMDBAPI(): Promise<boolean> {
  try {
    const results = await searchMovies('inception', 1);
    return Array.isArray(results) && results.length > 0;
  } catch (error) {
    console.error('TMDB API test failed:', error);
    return false;
  }
}