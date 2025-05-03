import { Film } from '@shared/schema';
import { mockFilms } from './mockData';

// Add match percentage and match reason to the mocked films for recommendation results
export const mockRecommendations: Film[] = mockFilms.map(film => ({
  ...film,
  matchPercentage: Math.floor(Math.random() * 40) + 60, // Random number between 60-99
  matchReason: `This matches your preference for ${film.genres[0]} films with high ratings.`,
  availableOn: film.availableStreamingByCountry?.US || []
}));