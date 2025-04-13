import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  EyeOff,
  CheckCircle2,
  Loader2
} from 'lucide-react';

type Film = {
  id: number;
  title: string;
  posterUrl: string;
  year: number;
};

type Rating = {
  filmId: number;
  status: 'not_seen' | 'not_interested' | 'loved' | 'liked' | 'meh' | 'hated';
  rating?: number;
};

interface FilmRatingGridProps {
  films: Film[];
  onSubmit: (ratings: Rating[]) => void;
  isSubmitting: boolean;
  showMorePrompt: boolean;
}

export const FilmRatingGrid: React.FC<FilmRatingGridProps> = ({
  films,
  onSubmit,
  isSubmitting,
  showMorePrompt
}) => {
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [expandedFilm, setExpandedFilm] = useState<number | null>(null);

  const handleRating = (filmId: number, status: Rating['status'], rating?: number) => {
    setRatings((prev) => ({
      ...prev,
      [filmId]: { filmId, status, rating }
    }));
    setExpandedFilm(null); // Close the expanded view
  };

  const handleSubmit = () => {
    // Convert record to array for submission
    const ratingsArray = Object.values(ratings);
    onSubmit(ratingsArray);
  };

  const handleMoreRatings = () => {
    // Submit current ratings and request more
    handleSubmit();
  };

  const handleNotNow = () => {
    // Submit current ratings but don't request more
    onSubmit(Object.values(ratings));
  };

  // If showing more prompt, render the prompt instead of films
  if (showMorePrompt) {
    return (
      <div className="flex flex-col items-center space-y-6 w-full">
        <p className="text-center font-medium">
          Want even better picks? Rate 10 more?
        </p>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={handleNotNow}
            disabled={isSubmitting}
          >
            Not Now
          </Button>
          <Button
            onClick={handleMoreRatings}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Yes, Show More"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {films.map((film) => (
          <Card 
            key={film.id} 
            className={`overflow-hidden relative cursor-pointer hover:shadow-md transition-shadow ${
              ratings[film.id] ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setExpandedFilm(expandedFilm === film.id ? null : film.id)}
          >
            <CardContent className="p-0 relative">
              <div className="aspect-[2/3] bg-muted relative">
                <img
                  src={film.posterUrl || `https://via.placeholder.com/300x450?text=${encodeURIComponent(film.title)}`}
                  alt={film.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-semibold text-center px-2">
                    {film.title} ({film.year})
                  </span>
                </div>

                {/* Rating indicator if rated */}
                {ratings[film.id] && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Rating options - shown when film is expanded */}
              {expandedFilm === film.id && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <p className="text-xs font-medium mb-2 text-center">{film.title}</p>
                  
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(film.id, 'not_seen');
                      }}
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      Not Seen
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(film.id, 'not_interested');
                      }}
                    >
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Not Interested
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(film.id, 'loved', 5);
                      }}
                    >
                      <Star className="h-3 w-3 mr-1 fill-yellow-400 stroke-yellow-400" />
                      Loved it
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(film.id, 'liked', 4);
                      }}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Liked it
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white col-span-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(film.id, 'meh', 3);
                      }}
                    >
                      <Star className="h-3 w-3 mr-1 fill-gray-400 stroke-gray-400" />
                      Meh
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white col-span-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(film.id, 'hated', 1);
                      }}
                    >
                      <ThumbsDown className="h-3 w-3 mr-1 fill-red-400 stroke-red-400" />
                      Hated it
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={isSubmitting || Object.keys(ratings).length === 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving Ratings...
          </>
        ) : (
          `Submit Ratings${Object.keys(ratings).length > 0 ? ` (${Object.keys(ratings).length})` : ''}`
        )}
      </Button>
    </div>
  );
};