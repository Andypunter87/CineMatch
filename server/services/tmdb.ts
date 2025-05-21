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

import { Film } from '@shared/schema';

// TMDB API Constants
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Poster sizes: "w92", "w154", "w185", "w342", "w500", "w780", "original"
const POSTER_SIZE = 'w500';
// Backdrop sizes: "w300", "w780", "w1280", "original"
const BACKDROP_SIZE = 'w1280';

// Image URL helpers
export const getPosterUrl = (posterPath: string) => 
  posterPath ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${posterPath}` : null;

export const getBackdropUrl = (backdropPath: string) => 
  backdropPath ? `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZE}${backdropPath}` : null;

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
 * Search for movies by title
 */
export async function searchMovies(query: string, page: number = 1): Promise<TMDBMovie[]> {
  const url = `${TMDB_API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json() as TMDBSearchResponse;
    return data.results || [];
  } catch (error) {
    console.error('Error searching movies:', error);
    return []; // Return empty array instead of throwing to prevent cascade failures
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting watch providers for movie ID ${movieId}:`, error);
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
      const errorText = await response.text();
      throw new Error(`TMDB API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
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
    // Fetch additional data if we only have basic movie info
    let movieDetails: TMDBMovieDetails;
    let credits: TMDBCredits;
    let watchProviders: TMDBWatchProviders;
    
    if ('genres' in movie) {
      // We already have detailed movie info
      movieDetails = movie as TMDBMovieDetails;
      credits = await getMovieCredits(movie.id);
      watchProviders = await getMovieWatchProviders(movie.id);
    } else {
      // We need to fetch detailed info
      movieDetails = await getMovieDetails(movie.id);
      credits = await getMovieCredits(movie.id);
      watchProviders = await getMovieWatchProviders(movie.id);
    }
    
    // Extract director from crew
    const director = credits.crew.find(person => person.job === 'Director')?.name || '';
    
    // Extract top 5 cast members
    const actors = credits.cast.slice(0, 5).map(actor => actor.name);
    
    // Extract genres
    const genres = movieDetails.genres.map(genre => genre.name);
    
    // Extract release year from release date
    const year = new Date(movieDetails.release_date).getFullYear();
    
    // Determine film type based on budget, production companies, and language
    const isIndie = isIndieFilm(movieDetails);
    
    // Get poster URL
    const posterUrl = getPosterUrl(movieDetails.poster_path || '');
    
    // Convert watch providers to our format
    const availableStreamingServices: Record<string, string[]> = {};
    
    if (watchProviders.results) {
      Object.entries(watchProviders.results).forEach(([countryCode, providers]) => {
        if (providers.flatrate) {
          availableStreamingServices[countryCode] = providers.flatrate.map(p => p.provider_name);
        }
      });
    }
    
    return {
      id: movieDetails.id,
      title: movieDetails.title,
      year,
      director,
      actors,
      synopsis: movieDetails.overview,
      genres,
      type: isIndie ? 'indie' : 'mainstream',
      posterUrl: posterUrl || '',
      tmdbId: movieDetails.id,
      availableStreamingByCountry: availableStreamingServices,
      runtime: movieDetails.runtime || 0,
      voteAverage: movieDetails.vote_average,
      originalLanguage: movieDetails.original_language,
      releaseDate: movieDetails.release_date,
      hasCompleteData: !!(posterUrl && movieDetails.runtime), // Flag if film has all required data
    };
  } catch (error) {
    console.error(`Error converting TMDB movie to Film:`, error);
    throw error;
  }
}

/**
 * Determine if a film is indie based on various factors
 */
function isIndieFilm(movie: TMDBMovieDetails): boolean {
  // Some heuristics to determine if a film is indie:
  // 1. Low budget (if available)
  // 2. Not from a major studio
  // 3. Not in English
  // 4. Low vote count (less popular)
  
  const majorStudios = [
    'Warner Bros.', 'Walt Disney', 'Universal', 'Columbia', 
    'Paramount', '20th Century', 'Sony', 'MGM', 'Lionsgate'
  ];
  
  const hasMajorStudio = movie.production_companies.some(company => 
    majorStudios.some(studio => company.name.includes(studio))
  );
  
  const isEnglishLanguage = movie.original_language === 'en';
  const isLowBudget = movie.budget < 10000000; // $10 million threshold
  const hasLowVotes = movie.vote_count < 1000;
  
  // Weight different factors
  let indieScore = 0;
  if (!hasMajorStudio) indieScore += 2;
  if (!isEnglishLanguage) indieScore += 1;
  if (isLowBudget) indieScore += 2;
  if (hasLowVotes) indieScore += 1;
  
  // Consider it indie if score is 3 or higher
  return indieScore >= 3;
}

/**
 * Test function to verify TMDB API connectivity
 */
export async function testTMDBAPI(): Promise<boolean> {
  try {
    const result = await getPopularMovies(1);
    console.log(`TMDB API test successful: Found ${result.results.length} popular movies`);
    return true;
  } catch (error) {
    console.error('TMDB API test failed:', error);
    return false;
  }
}