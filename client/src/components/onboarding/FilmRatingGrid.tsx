import React, { useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Star, EyeOff } from 'lucide-react';

interface Film {
  id: number;
  title: string;
  posterUrl: string;
  year: number;
  genres: string[];
  type: 'mainstream' | 'indie';
}

interface FilmRating {
  filmId: number;
  status: 'not_seen' | 'not_interested' | 'loved' | 'liked' | 'meh' | 'hated';
  rating?: number;
}

interface FilmRatingGridProps {
  films: Film[];
  onRatingComplete: (ratings: FilmRating[]) => void;
  isLoading?: boolean;
}

export const FilmRatingGrid: React.FC<FilmRatingGridProps> = ({
  films,
  onRatingComplete,
  isLoading = false,
}) => {
  const [ratings, setRatings] = useState<Record<number, FilmRating>>({});

  const handleRateFilm = (filmId: number, stars: number | null) => {
    // Convert stars to status and rating
    let status: FilmRating['status'];
    let rating: number | undefined;
    
    if (stars === null) {
      status = 'not_seen';
      rating = undefined;
    } else if (stars === 0) {
      status = 'not_interested';
      rating = 0;
    } else if (stars === 5) {
      status = 'loved';
      rating = 5;
    } else if (stars >= 4) {
      status = 'liked';
      rating = stars;
    } else if (stars >= 2) {
      status = 'meh';
      rating = stars;
    } else {
      status = 'hated';
      rating = stars;
    }
    
    setRatings(prev => ({
      ...prev,
      [filmId]: { filmId, status, rating }
    }));
  };

  const handleSubmit = () => {
    const ratingsList = Object.values(ratings);
    
    // For any film without a rating, add it as "not_seen"
    films.forEach(film => {
      if (!ratings[film.id]) {
        ratingsList.push({
          filmId: film.id,
          status: 'not_seen'
        });
      }
    });
    
    onRatingComplete(ratingsList);
  };

  // Calculate how many films have been rated
  const ratedCount = Object.keys(ratings).length;
  const totalFilms = films.length;

  // State to track which set of 3 films we're viewing
  const [currentPage, setCurrentPage] = useState(0);
  
  // Show only 3 films at a time
  const filmsPerPage = 3;
  const totalPages = Math.ceil(films.length / filmsPerPage);
  
  // Get the current set of films to display
  const getCurrentFilms = () => {
    const startIdx = currentPage * filmsPerPage;
    return films.slice(startIdx, startIdx + filmsPerPage);
  };
  
  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Calculate overall progress
  const overallProgress = Math.round((ratedCount / totalFilms) * 100);
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Rate some movies</h2>
        <p className="text-muted-foreground">
          Give stars to movies you've seen, or mark them as "Haven't Seen"
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-2 w-full max-w-md bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {ratedCount}/12
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading films...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {getCurrentFilms().map((film) => (
              <FilmRatingCard
                key={film.id}
                film={film}
                currentRating={ratings[film.id]?.rating}
                onRateFilm={handleRateFilm}
              />
            ))}
          </div>
          
          {/* Page navigation */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            
            <div className="text-sm text-center">
              Page {currentPage + 1} of {totalPages}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>

          <div className="flex justify-center mt-8">
            <Button
              onClick={handleSubmit}
              size="lg"
              className="w-full max-w-xs"
              disabled={ratedCount === 0}
            >
              Complete Ratings
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

interface FilmRatingCardProps {
  film: Film;
  currentRating?: number;
  onRateFilm: (filmId: number, stars: number | null) => void;
}

const FilmRatingCard: React.FC<FilmRatingCardProps> = ({
  film,
  currentRating,
  onRateFilm,
}) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  return (
    <Card className="overflow-hidden transition-all duration-200 border-2 border-gray-200">
      <CardContent className="p-0">
        <div className="aspect-[2/3] relative">
          {/* Film poster */}
          <div className="absolute inset-0 z-10">
            <img 
              src={film.posterUrl} 
              alt={`${film.title} poster`} 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Film title and year overlay at top */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 to-transparent p-3 text-center">
            <h3 className="text-base sm:text-lg font-bold text-white">{film.title}</h3>
            <p className="text-sm text-white/90">{film.year}</p>
          </div>
          
          {/* Rating interface - positioned at bottom, semi-transparent */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black to-transparent">
            <div className="text-white text-center mb-2 text-sm font-medium">
              Rate this movie:
            </div>
            
            {/* Star Rating - Make sure all 5 stars are visible */}
            <div className="flex justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRateFilm(film.id, star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className={`mx-1 transition-all duration-150 ${
                    (hoveredStar && star <= hoveredStar) || (currentRating && currentRating >= star)
                      ? 'text-yellow-300'
                      : 'text-gray-400'
                  }`}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star 
                    className={`w-6 h-6 ${
                      (hoveredStar && star <= hoveredStar) || (currentRating && currentRating >= star)
                        ? 'fill-yellow-300 stroke-yellow-300'
                        : 'stroke-white'
                    }`} 
                  />
                </button>
              ))}
            </div>
            
            {/* Rating description */}
            <div className="text-center mb-2 h-5">
              {hoveredStar && (
                <span className="text-xs text-yellow-300 font-medium">
                  {hoveredStar === 1 && "Didn't like it"}
                  {hoveredStar === 2 && "It was OK"}
                  {hoveredStar === 3 && "Liked it"}
                  {hoveredStar === 4 && "Really liked it"}
                  {hoveredStar === 5 && "Loved it!"}
                </span>
              )}
              {!hoveredStar && currentRating && (
                <span className="text-xs text-yellow-300 font-medium">
                  {currentRating === 1 && "Didn't like it"}
                  {currentRating === 2 && "It was OK"}
                  {currentRating === 3 && "Liked it"}
                  {currentRating === 4 && "Really liked it"}
                  {currentRating === 5 && "Loved it!"}
                </span>
              )}
            </div>
            
            {/* Haven't Seen Button */}
            <button
              onClick={() => onRateFilm(film.id, null)}
              className={`w-full flex items-center justify-center py-1 px-2 rounded text-sm font-medium ${
                currentRating === undefined
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-800/70 text-white/90 hover:bg-gray-800'
              }`}
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Haven't Seen It
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilmRatingGrid;