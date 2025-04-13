import React, { useState } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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

  const handleRateFilm = (filmId: number, status: FilmRating['status']) => {
    // Convert status to rating
    let rating: number | undefined;
    
    switch (status) {
      case 'loved':
        rating = 5;
        break;
      case 'liked':
        rating = 4;
        break;
      case 'meh':
        rating = 3;
        break;
      case 'hated':
        rating = 1;
        break;
      default:
        rating = undefined;
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
          Tap to tell us what you've watched and enjoyed.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-2 w-full max-w-md bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">
            {ratedCount}/{totalFilms}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {getCurrentFilms().map((film) => (
              <FilmRatingCard
                key={film.id}
                film={film}
                selectedStatus={ratings[film.id]?.status}
                onRateFilm={handleRateFilm}
              />
            ))}
          </div>
          
          {/* Page navigation */}
          <div className="flex justify-between items-center mt-6">
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
  selectedStatus?: FilmRating['status'];
  onRateFilm: (filmId: number, status: FilmRating['status']) => void;
}

const FilmRatingCard: React.FC<FilmRatingCardProps> = ({
  film,
  selectedStatus,
  onRateFilm,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  // Display options when hovering or when a rating is already selected
  const showOptions = isHovering || selectedStatus;

  return (
    <Card
      className="overflow-hidden relative transition-all duration-200"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <CardContent className="p-0">
        {/* Film Poster */}
        <div className="aspect-[2/3] relative">
          <img
            src={film.posterUrl}
            alt={`${film.title} (${film.year})`}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              showOptions ? 'opacity-30' : 'opacity-100'
            }`}
          />
          
          {/* Film Title */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
            <h3 className="text-sm font-medium line-clamp-2">{film.title}</h3>
            <p className="text-xs opacity-80">{film.year}</p>
          </div>

          {/* Rating Options - Now with a better layout */}
          {(showOptions || true) && ( // Always show options on mobile for better UX
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-2 bg-black/60">
              <div className="text-white text-center mb-1 text-sm font-medium">Rate this movie:</div>
              <div className="flex flex-col gap-2 w-full max-w-[90%]">
                <div className="flex justify-between gap-2">
                  <RatingButton
                    status="loved"
                    label="Loved It"
                    selected={selectedStatus === 'loved'}
                    onClick={() => onRateFilm(film.id, 'loved')}
                    fullWidth={true}
                  />
                  <RatingButton
                    status="liked"
                    label="Liked It"
                    selected={selectedStatus === 'liked'}
                    onClick={() => onRateFilm(film.id, 'liked')}
                    fullWidth={true}
                  />
                </div>
                <div className="flex justify-between gap-2">
                  <RatingButton
                    status="meh"
                    label="It was OK"
                    selected={selectedStatus === 'meh'}
                    onClick={() => onRateFilm(film.id, 'meh')}
                    fullWidth={true}
                  />
                  <RatingButton
                    status="hated"
                    label="Disliked"
                    selected={selectedStatus === 'hated'}
                    onClick={() => onRateFilm(film.id, 'hated')}
                    fullWidth={true}
                  />
                </div>
                <div className="flex justify-between gap-2 mt-1">
                  <RatingButton
                    status="not_seen"
                    label="Haven't Seen"
                    selected={selectedStatus === 'not_seen'}
                    onClick={() => onRateFilm(film.id, 'not_seen')}
                    fullWidth={true}
                    secondary={true}
                  />
                  <RatingButton
                    status="not_interested"
                    label="Not For Me"
                    selected={selectedStatus === 'not_interested'}
                    onClick={() => onRateFilm(film.id, 'not_interested')}
                    fullWidth={true}
                    secondary={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface RatingButtonProps {
  status: FilmRating['status'];
  label: string;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
  secondary?: boolean;
}

const RatingButton: React.FC<RatingButtonProps> = ({
  status,
  label,
  selected,
  onClick,
  fullWidth = false,
  secondary = false,
}) => {
  // Define colors based on status and type
  let bgColor;
  
  if (selected) {
    bgColor = secondary 
      ? 'bg-gray-700 text-white' 
      : 'bg-primary text-primary-foreground';
  } else {
    bgColor = secondary 
      ? 'bg-black/40 text-white hover:bg-black/60' 
      : 'bg-black/50 text-white hover:bg-black/70';
  }
  
  // Emoji mapping
  const emoji = {
    'not_seen': '👁️',
    'not_interested': '🚫',
    'loved': '❤️',
    'liked': '👍',
    'meh': '😐',
    'hated': '👎',
  }[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`
              ${bgColor} 
              ${fullWidth ? 'flex-1' : ''} 
              text-xs rounded px-2 py-1.5 
              transition-colors duration-200 
              flex items-center justify-center
              shadow-md hover:shadow-lg
            `}
          >
            <span className="inline-block mr-1">{emoji}</span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FilmRatingGrid;