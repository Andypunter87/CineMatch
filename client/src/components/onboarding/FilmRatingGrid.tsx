import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Star, EyeOff, Film as FilmIcon } from 'lucide-react';
import PosterImage from '@/components/ui/poster-image';
import { prefetchImages } from '@/lib/imageCache';

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
  
  // Prefetch all film poster images on component mount
  useEffect(() => {
    if (films.length > 0) {
      // Create a list of all poster URLs with proxy URLs
      const posterUrls = films.map(film => 
        film.posterUrl ? `/api/image/poster?url=${encodeURIComponent(film.posterUrl)}` : ''
      ).filter(url => url !== '');
      
      // Prefetch all poster images
      prefetchImages(posterUrls);
    }
  }, [films]);

  // State to track which set of 3 films we're viewing
  const [currentPage, setCurrentPage] = useState(0);
  
  // Show only 1 film at a time
  const filmsPerPage = 1;
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
  
  // Whether to show progress animation
  const [progressAnimation, setProgressAnimation] = useState(false);
  
  // Update progress animation when ratings change
  useEffect(() => {
    if (ratedCount > 0) {
      setProgressAnimation(true);
      const timer = setTimeout(() => setProgressAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [ratedCount]);
  
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
              className={`h-full bg-primary rounded-full transition-all duration-300 ${
                progressAnimation ? 'animate-pulse' : ''
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            progressAnimation ? 'scale-110 text-primary font-bold' : ''
          }`}>
            {ratedCount}/12
          </span>
        </div>
        
        {ratedCount >= 5 && ratedCount < totalFilms && (
          <div className="mt-2 text-sm text-green-600 animate-pulse">
            You've rated enough movies! You can continue or click "Complete Ratings"
          </div>
        )}
        {ratedCount === totalFilms && (
          <div className="mt-2 text-sm font-medium text-green-600">
            Great job! You've rated all the movies.
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading films...</span>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            {getCurrentFilms().map((film) => (
              <div className="w-full max-w-xs sm:max-w-sm md:max-w-md" key={film.id}>
                <FilmRatingCard
                  film={film}
                  currentRating={ratings[film.id]?.rating}
                  onRateFilm={handleRateFilm}
                />
              </div>
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
  const [haventSeenClicked, setHaventSeenClicked] = useState(false);
  const [starClickedAnimation, setStarClickedAnimation] = useState(false);
  
  // Function to handle "Haven't Seen It" button click with visual feedback
  const handleHaventSeen = () => {
    setHaventSeenClicked(true);
    onRateFilm(film.id, null);
    
    // Reset after animation completes
    setTimeout(() => setHaventSeenClicked(false), 1500);
  };
  
  // Function to handle star rating with visual feedback
  const handleStarClick = (star: number) => {
    setStarClickedAnimation(true);
    onRateFilm(film.id, star);
    
    // Reset animation after it completes
    setTimeout(() => setStarClickedAnimation(false), 1000);
  };

  // Proxy the image through our server-side proxy for better reliability
  const proxyPosterUrl = film.posterUrl ? `/api/image/poster?url=${encodeURIComponent(film.posterUrl)}` : '';

  return (
    <Card className="overflow-hidden transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-gray-300 rounded-xl">
      <CardContent className="p-0">
        <div className="aspect-[2/3] relative">
          {/* Film poster with loading/error states using enhanced PosterImage component */}
          <div className="absolute inset-0 z-10 bg-gray-900">
            <PosterImage 
              posterUrl={proxyPosterUrl} 
              title={film.title}
              className="w-full h-full" 
              showLoadingState={true}
              showErrorState={true}
              priority={true}
            />
          </div>
          
          {/* Film title and year overlay at top - increased padding and z-index */}
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-4 pt-5 text-center">
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1">{film.title}</h3>
            <p className="text-sm text-white/90">{film.year}</p>
          </div>
          
          {/* Rating interface - positioned at bottom, semi-transparent */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black to-transparent">
            <div className="text-white text-center mb-2 text-sm font-medium">
              Rate this movie:
            </div>
            
            {/* Star Rating - Make sure all 5 stars are visible */}
            <div className="flex justify-center mb-4 space-x-2 sm:space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  disabled={starClickedAnimation}
                  className={`transition-all duration-150 transform relative ${
                    (hoveredStar && star <= hoveredStar) || (currentRating && currentRating >= star)
                      ? 'text-yellow-300'
                      : 'text-gray-400'
                  } ${currentRating === star && starClickedAnimation ? 'animate-pulse' : 'hover:scale-110'}`}
                  aria-label={`Rate ${star} stars`}
                >
                  {/* Star animation effect */}
                  {currentRating === star && starClickedAnimation && (
                    <span className="absolute inset-0 flex items-center justify-center animate-ping opacity-70">
                      <Star className="w-8 h-8 sm:w-10 sm:h-10 fill-yellow-300 stroke-yellow-300" />
                    </span>
                  )}
                  
                  <Star 
                    className={`w-8 h-8 sm:w-10 sm:h-10 filter drop-shadow-md ${
                      (hoveredStar && star <= hoveredStar) || (currentRating && currentRating >= star)
                        ? 'fill-yellow-300 stroke-yellow-300'
                        : 'stroke-white'
                    } ${currentRating === star && starClickedAnimation ? 'animate-bounce' : ''}`} 
                  />
                </button>
              ))}
            </div>
            
            {/* Rating description with feedback */}
            <div className="text-center mb-4 bg-black/30 py-1.5 rounded-md min-h-[2.5rem] relative">
              {/* Star clicked animation feedback */}
              {starClickedAnimation && (
                <div className="absolute inset-0 bg-green-600/20 rounded-md flex items-center justify-center">
                  <span className="text-sm sm:text-base text-white font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Rating saved!
                  </span>
                </div>
              )}
              
              {/* Normal rating descriptions */}
              <div className={starClickedAnimation ? 'opacity-0' : 'opacity-100'}>
                {hoveredStar && (
                  <span className="text-sm sm:text-base text-yellow-300 font-medium">
                    {hoveredStar === 1 && "Didn't like it"}
                    {hoveredStar === 2 && "It was OK"}
                    {hoveredStar === 3 && "Liked it"}
                    {hoveredStar === 4 && "Really liked it"}
                    {hoveredStar === 5 && "Loved it!"}
                  </span>
                )}
                {!hoveredStar && currentRating && (
                  <span className="text-sm sm:text-base text-yellow-300 font-medium">
                    {currentRating === 1 && "Didn't like it"}
                    {currentRating === 2 && "It was OK"}
                    {currentRating === 3 && "Liked it"}
                    {currentRating === 4 && "Really liked it"}
                    {currentRating === 5 && "Loved it!"}
                  </span>
                )}
                {!hoveredStar && !currentRating && (
                  <span className="text-sm sm:text-base text-gray-300 font-medium">
                    Tap a star to rate
                  </span>
                )}
              </div>
            </div>
            
            {/* Haven't Seen Button with visual feedback */}
            <button
              onClick={handleHaventSeen}
              disabled={haventSeenClicked}
              className={`w-full flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium 
                transition-all duration-300 relative overflow-hidden ${
                currentRating === undefined
                  ? haventSeenClicked 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-gray-800/80 text-white/90 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {/* Success animation overlay */}
              {haventSeenClicked && (
                <span className="absolute inset-0 flex items-center justify-center bg-green-600 text-white animate-pulse">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Marked as Not Seen
                  </span>
                </span>
              )}
              
              {/* Normal button content */}
              <EyeOff className={`h-4 w-4 mr-2 ${haventSeenClicked ? 'opacity-0' : 'opacity-100'}`} />
              <span className={haventSeenClicked ? 'opacity-0' : 'opacity-100'}>
                Haven't Seen It
              </span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilmRatingGrid;