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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Rate some movies</h2>
        <p className="text-muted-foreground">
          Tap to tell us what you've watched and enjoyed.
        </p>
        <div className="mt-2 text-sm text-primary">
          {ratedCount} of {totalFilms} rated
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading films...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {films.map((film) => (
              <FilmRatingCard
                key={film.id}
                film={film}
                selectedStatus={ratings[film.id]?.status}
                onRateFilm={handleRateFilm}
              />
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <Button
              onClick={handleSubmit}
              size="lg"
              className="w-full max-w-xs"
              disabled={ratedCount === 0}
            >
              Continue
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

          {/* Rating Options */}
          {showOptions && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
              <div className="grid grid-cols-2 gap-1 w-full">
                <RatingButton
                  status="not_seen"
                  label="Not Seen"
                  selected={selectedStatus === 'not_seen'}
                  onClick={() => onRateFilm(film.id, 'not_seen')}
                />
                <RatingButton
                  status="not_interested"
                  label="Not Interested"
                  selected={selectedStatus === 'not_interested'}
                  onClick={() => onRateFilm(film.id, 'not_interested')}
                />
                <RatingButton
                  status="loved"
                  label="Loved It"
                  selected={selectedStatus === 'loved'}
                  onClick={() => onRateFilm(film.id, 'loved')}
                />
                <RatingButton
                  status="liked"
                  label="Liked It"
                  selected={selectedStatus === 'liked'}
                  onClick={() => onRateFilm(film.id, 'liked')}
                />
                <RatingButton
                  status="meh"
                  label="Meh"
                  selected={selectedStatus === 'meh'}
                  onClick={() => onRateFilm(film.id, 'meh')}
                />
                <RatingButton
                  status="hated"
                  label="Hated It"
                  selected={selectedStatus === 'hated'}
                  onClick={() => onRateFilm(film.id, 'hated')}
                />
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
}

const RatingButton: React.FC<RatingButtonProps> = ({
  status,
  label,
  selected,
  onClick,
}) => {
  // Define colors based on status
  let bgColor = selected ? 'bg-primary text-primary-foreground' : 'bg-black/50 text-white hover:bg-black/70';
  
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
            className={`${bgColor} text-xs rounded p-1 transition-colors duration-200 flex items-center justify-center`}
          >
            <span className="hidden sm:inline">{emoji}</span>
            <span className="sm:ml-1 text-[10px] sm:text-xs line-clamp-1">{label}</span>
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