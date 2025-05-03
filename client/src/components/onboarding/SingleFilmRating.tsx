import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ArrowRight, ArrowLeft, X } from "lucide-react";
import { PosterImage } from "../ui/poster-image";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Interface for Film from the onboarding page - matches local type
interface Film {
  id: number;
  title: string;
  posterUrl: string;
  year: number;
  genres: string[];
  type: 'mainstream' | 'indie';
  director: string;
  synopsis: string;
  actors?: string[];
}

// Interface for FilmRating from the onboarding page - matches local type
interface FilmRating {
  filmId: number;
  filmTitle: string;
  filmPosterUrl: string;
  rating: number | null;
  status: string;
}

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
    // Make sure status matches server-side schema requirements 
    // (matches the values in server/routes/onboarding.ts ratingSchema)
    let status = "not_seen";
    if (rating === null) {
      status = "not_seen";
    } else if (rating === 1) {
      status = "hated";
    } else if (rating === 2) {
      status = "meh";
    } else if (rating === 3 || rating === 4) {
      status = "liked";
    } else {
      status = "loved";
    }
    
    console.log(`Rating film ${filmId} with rating ${rating}, status: ${status}`);
    
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
        <div className="relative aspect-[2/3] w-full h-auto group">
          <PosterImage 
            posterUrl={currentFilm.posterUrl || ''} // Ensure posterUrl is never undefined
            title={currentFilm.title} 
            priority={currentIndex < 3} // Prioritize loading the first few images
            className="w-full h-full object-cover"
          />
          
          {/* Subtle prompt to indicate poster is interactive */}
          {!ratings[currentFilm.id] && (
            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
              <p className="text-xs text-white opacity-80">Click poster to rate</p>
            </div>
          )}
          
          {/* Overlay with Star Ratings */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${
            ratings[currentFilm.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-90'
          }`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            
            <div className="relative z-10 p-4 flex flex-col items-center space-y-4">
              {/* Star Rating */}
              <div className="p-3 rounded-lg bg-black/50 backdrop-blur-sm">
                <p className="font-medium text-white text-sm mb-2 text-center">Rate this film:</p>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      className={`p-1 h-10 w-10 ${
                        ratings[currentFilm.id]?.rating === star 
                          ? 'text-yellow-400 bg-yellow-500/20 ring-2 ring-yellow-400 scale-110' 
                          : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-500/10'
                      }`}
                      onClick={() => rateFilm(currentFilm.id, star)}
                    >
                      <Star className="h-6 w-6" fill={ratings[currentFilm.id]?.rating === star ? "currentColor" : "none"} />
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Haven't Seen Button */}
              <Button
                variant={ratings[currentFilm.id]?.rating === null ? "default" : "outline"}
                size="sm"
                className={`text-sm ${
                  ratings[currentFilm.id]?.rating === null 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-black/50 text-white hover:bg-black/70"
                }`}
                onClick={() => rateFilm(currentFilm.id, null)}
              >
                Haven't seen it
              </Button>
            </div>
          </div>
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
            
            {/* Rating indicator - shows which rating was selected */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Your rating:</p>
              <div className="flex items-center">
                {ratings[currentFilm.id]?.rating === null ? (
                  <span className="text-sm text-muted-foreground">Haven't seen it</span>
                ) : ratings[currentFilm.id]?.rating ? (
                  <div className="flex">
                    {Array.from({ length: ratings[currentFilm.id]?.rating || 0 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500" fill="currentColor" />
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not rated</span>
                )}
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