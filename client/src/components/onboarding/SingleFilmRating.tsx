import { useState, useEffect } from "react";
import { Film } from "@shared/schema";
import { FilmRating } from "@/lib/types/film-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ArrowRight, ArrowLeft, X } from "lucide-react";
import { PosterImage } from "../ui/poster-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SingleFilmRatingProps {
  films: Film[];
  onRatingComplete: (ratings: FilmRating[]) => void;
  isLoading: boolean;
  batchNumber?: number;
  onSkip?: () => void;
}

export function SingleFilmRating({
  films,
  onRatingComplete,
  isLoading,
  batchNumber = 1,
  onSkip
}: SingleFilmRatingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<number, { rating: number | null; status: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset current index when films change
  useEffect(() => {
    if (films.length > 0) {
      setCurrentIndex(0);
    }
  }, [films]);

  // Current film based on index
  const currentFilm = films[currentIndex];

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

  // Move to next film
  const handleNext = () => {
    if (currentIndex < films.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  // Move to previous film
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Determine if we can move next (requires rating the current film)
  const canMoveNext = () => {
    return currentFilm && ratings[currentFilm.id]?.rating !== undefined;
  };

  // Submit all ratings
  const handleSubmit = () => {
    setIsSubmitting(true);
    
    const formattedRatings: FilmRating[] = Object.keys(ratings).map(filmIdStr => {
      const filmId = parseInt(filmIdStr);
      const film = films.find(f => f.id === filmId);
      const rating = ratings[filmId];
      
      if (!film) {
        throw new Error(`Film with ID ${filmId} not found in films array`);
      }
      
      return {
        filmId: film.id,
        filmTitle: film.title,
        filmPosterUrl: film.posterUrl || "",
        rating: rating.rating,
        status: rating.status,
      };
    });
    
    onRatingComplete(formattedRatings);
    setIsSubmitting(false);
  };

  // Determine if we've rated enough films to submit
  const canSubmit = () => {
    const ratedCount = Object.values(ratings).filter(r => r.rating !== null).length;
    return ratedCount >= Math.min(5, films.length);
  };

  // Handle skipping the current film
  const skipCurrentFilm = () => {
    if (currentIndex < films.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (canSubmit()) {
      handleSubmit();
    } else if (onSkip) {
      onSkip();
    }
  };

  // Show loading state when films are loading
  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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

  // Calculate progress percentage
  const progressPercentage = (currentIndex / films.length) * 100;

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-medium">Rate films to get personalized recommendations</h3>
        <p className="text-sm text-muted-foreground">
          Rate at least {Math.min(5, films.length)} films to continue
        </p>
        <div className="mt-2">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Film {currentIndex + 1} of {films.length}
          </p>
        </div>
      </div>
      
      <Card className="overflow-hidden mx-auto max-w-sm">
        <div className="relative aspect-[2/3] w-full h-auto">
          <PosterImage 
            posterUrl={currentFilm.posterUrl} 
            title={currentFilm.title} 
            priority={currentIndex < 3} // Prioritize loading the first few images
            className="w-full h-full object-cover"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div>
              <h3 className="font-bold text-lg line-clamp-1">{currentFilm.title}</h3>
              <p className="text-sm text-muted-foreground">
                {currentFilm.year} • {currentFilm.director}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {currentFilm.genres.slice(0, 3).map(genre => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
            
            <div className="py-2">
              <p className="text-sm line-clamp-3">{currentFilm.synopsis}</p>
            </div>
            
            <div className="pt-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Have you seen this film?</p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={ratings[currentFilm.id]?.rating === null ? "bg-secondary" : ""}
                    onClick={() => rateFilm(currentFilm.id, null)}
                  >
                    Haven't seen it
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium">Or rate it:</p>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      className={`p-1 h-8 w-8 ${ratings[currentFilm.id]?.rating === star ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20' : 'text-muted-foreground'}`}
                      onClick={() => rateFilm(currentFilm.id, star)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={skipCurrentFilm}
          className="mx-2"
        >
          <X className="h-4 w-4 mr-1" />
          Skip
        </Button>
        
        {currentIndex < films.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!ratings[currentFilm.id]}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit()}
          >
            {isSubmitting ? "Saving..." : "Finish"}
          </Button>
        )}
      </div>
      
      {!canSubmit() && currentIndex === films.length - 1 && (
        <p className="text-sm text-muted-foreground text-center">
          Please rate at least {Math.min(5, films.length)} films to continue
        </p>
      )}
    </div>
  );
}