import React, { useState } from "react";
import { Film } from "@shared/schema";
import { FilmRating } from "@/lib/types/film-rating";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, StarHalf, Loader2 } from "lucide-react";
import { PosterImage } from "@/components/ui/poster-image";

interface FilmRatingGridProps {
  films: Film[];
  onRatingComplete: (ratings: FilmRating[]) => void;
  isLoading: boolean;
  batchNumber?: number;
}

export function FilmRatingGrid({ 
  films, 
  onRatingComplete, 
  isLoading,
  batchNumber = 1
}: FilmRatingGridProps) {
  const [ratings, setRatings] = useState<Record<number, { rating: number | null; status: string }>>({});
  const [isRating, setIsRating] = useState(false);

  // Set a rating for a film
  const rateFilm = (filmId: number, rating: number | null) => {
    let status = "not_seen";
    if (rating === null) {
      status = "not_seen";
    } else if (rating <= 2) {
      status = "seen";
    } else if (rating <= 4) {
      status = "liked";
    } else {
      status = "loved";
    }
    
    setRatings(prev => ({
      ...prev,
      [filmId]: { rating, status }
    }));
  };

  // Submit all ratings
  const handleSubmit = () => {
    setIsRating(true);
    
    const formattedRatings: FilmRating[] = films.map(film => {
      const rating = ratings[film.id] || { rating: null, status: "not_seen" };
      return {
        filmId: film.id,
        filmTitle: film.title,
        filmPosterUrl: film.posterUrl || "",
        rating: rating.rating,
        status: rating.status,
      };
    });
    
    onRatingComplete(formattedRatings);
    setIsRating(false);
  };

  // Determine if enough films have been rated to proceed
  const canProceed = () => {
    // Count how many films have a rating
    const ratedCount = Object.values(ratings).filter(r => r.rating !== null).length;
    return ratedCount >= 5; // Require at least 5 ratings
  };

  // Show loading state when films are loading
  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading films to rate...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no films are available
  if (!films || films.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No films available to rate at this time.</p>
        <Button 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {films.map(film => (
          <Card key={film.id} className="overflow-hidden flex flex-col">
            <div className="relative aspect-[2/3] w-full">
              <PosterImage
                posterUrl={film.posterUrl || ""}
                title={film.title}
                className="object-cover w-full h-full"
              />
            </div>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <h3 className="font-medium text-sm mb-2 line-clamp-2">{film.title}</h3>
              
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Have you seen this film?</p>
                <div className="flex justify-between">
                  <Button 
                    variant={ratings[film.id]?.rating === null ? "secondary" : "outline"} 
                    size="sm" 
                    className="text-xs w-1/2 mr-1"
                    onClick={() => rateFilm(film.id, null)}
                  >
                    Haven't Seen
                  </Button>
                  <div className="flex w-1/2 ml-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Button 
                        key={star} 
                        variant="ghost" 
                        size="sm" 
                        className={`p-1 h-8 ${ratings[film.id]?.rating === star ? 'text-yellow-500' : 'text-muted-foreground'}`}
                        onClick={() => rateFilm(film.id, star)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isRating || !canProceed()}
          className="w-full sm:w-auto"
        >
          {isRating ? "Saving..." : "Save Ratings"}
        </Button>
      </div>
      
      {!canProceed() && (
        <p className="text-sm text-muted-foreground text-center">
          Please rate at least 5 films to continue
        </p>
      )}
    </div>
  );
}