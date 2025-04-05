import { RecommendationRequest } from "@shared/schema";

export interface WatchlistItem {
  id: number;
  userId: number;
  filmId: number;
  filmTitle: string;
  filmYear?: number;
  filmDirector?: string;
  filmType?: string;
  filmGenres?: string[];
  filmPosterUrl?: string;
  recommendationContext?: RecommendationRequest;
  dateAdded: string;
  watched: boolean;
  dateWatched?: string;
  userRating?: number;
  userNotes?: string;
}