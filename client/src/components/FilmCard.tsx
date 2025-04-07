import { useState } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Film as FilmIcon, Star, Award, BookmarkPlus, Loader2, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface FilmCardProps {
  film: Film;
  recommendationContext?: RecommendationRequest;
}

export default function FilmCard({ film, recommendationContext }: FilmCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/watchlist", {
        filmId: film.id,
        filmTitle: film.title,
        filmYear: film.year,
        filmDirector: film.director,
        filmType: film.type,
        filmGenres: film.genres,
        filmPosterUrl: film.posterUrl,
        recommendationContext,
        // Default to unwatched when adding to watchlist
        watched: false
      });
      return await res.json();
    },
    onSuccess: (watchlistItem) => {
      // Only invalidate watchlist data without redirecting to homepage
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      
      // Track film added to watchlist event
      trackEvent(AnalyticsEvents.FILM_ADDED_TO_WATCHLIST, {
        film_id: film.id,
        film_title: film.title,
        film_year: film.year,
        film_type: film.type,
        film_genres: film.genres.join(','),
        match_percentage: film.matchPercentage || 90,
        from_recommendation: !!recommendationContext
      });
      
      // Show confirmation message within the card
      setShowConfirmation(true);
      
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => {
        setShowConfirmation(false);
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add to watchlist: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  // Generate a background gradient based on the film title
  const getBackgroundGradient = () => {
    // Define a list of colorful gradients
    const gradients = [
      "linear-gradient(135deg, #3498db, #2c3e50)",
      "linear-gradient(135deg, #e74c3c, #c0392b)",
      "linear-gradient(135deg, #1abc9c, #16a085)",
      "linear-gradient(135deg, #9b59b6, #8e44ad)",
      "linear-gradient(135deg, #f1c40f, #f39c12)",
      "linear-gradient(135deg, #1e88e5, #0d47a1)",
      "linear-gradient(135deg, #43a047, #1b5e20)",
      "linear-gradient(135deg, #fb8c00, #e65100)", 
      "linear-gradient(135deg, #5e35b1, #311b92)"
    ];
    
    // Get a consistent gradient based on the film title
    const titleHash = (film.title || "Movie").split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return gradients[titleHash % gradients.length];
  };

  // Ensure we have valid film data
  const title = film.title || "Unknown Title";
  const year = film.year || "Unknown Year";
  const director = film.director || "Unknown Director";
  const actors = Array.isArray(film.actors) && film.actors.length > 0 
    ? film.actors 
    : ["Unknown Cast"];
  const synopsis = film.synopsis || "No synopsis available";
  const genres = Array.isArray(film.genres) && film.genres.length > 0 
    ? film.genres 
    : ["Drama"];
  const matchPercentage = film.matchPercentage || 90;
  
  return (
    <Card className="recommendation-card bg-white rounded-lg overflow-hidden shadow-[0_4px_14px_0_rgba(59,130,246,0.2)] border border-blue-100 group hover:shadow-[0_8px_20px_0_rgba(59,130,246,0.25)] transition-all duration-200 h-full flex flex-col">
      <div className="relative flex-shrink-0">
        {/* Poster with gradient background */}
        <div 
          className="w-full h-72 flex items-center justify-center text-center p-4"
          style={{ background: getBackgroundGradient() }}
        >
          <div className="flex flex-col items-center">
            <FilmIcon className="w-10 h-10 text-white/80 mb-4" />
            <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{title}</h3>
            <p className="text-white/90 font-medium">{year}</p>
            <p className="text-white/70 text-sm mt-2">{director}</p>
          </div>
        </div>
        
        {/* Match percentage badge */}
        <div className="absolute top-2 right-2 z-10 max-w-[42%]">
          <Badge className="bg-primary text-white px-1.5 py-0.5 text-[10px] sm:text-xs sm:px-2 sm:py-0.5 font-medium max-w-full truncate">
            <Star className="w-3 h-3 mr-0.5 sm:mr-1 inline flex-shrink-0" />
            <span className="truncate">{matchPercentage}% Match</span>
          </Badge>
        </div>
        
        {/* Film type badge */}
        <div className="absolute top-2 left-2 z-10 max-w-[42%]">
          <Badge variant="outline" className="bg-white/90 text-gray-700 border-blue-200 px-1.5 py-0.5 text-[10px] sm:text-xs sm:px-2 sm:py-0.5 max-w-full truncate">
            <span className="truncate">{film.type === "indie" ? "Independent" : "Mainstream"}</span>
          </Badge>
        </div>
        
        <div className="recommendation-details absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent p-3 md:p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-lg md:text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-200 text-xs md:text-sm">
            {year} • {director}
          </p>
          <div className="mt-1 md:mt-2 bg-black/50 backdrop-blur-sm rounded p-2">
            <p className="text-xs md:text-sm text-white leading-snug line-clamp-4">{synopsis}</p>
          </div>
          <div className="mt-2 md:mt-3 flex flex-wrap gap-1">
            {genres.map((genre, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-500/80 text-white text-xs px-1.5 py-0.5 max-w-[90px] truncate">
                <span className="truncate">{genre}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{title}</h3>
          <span className="text-gray-500 text-sm whitespace-nowrap ml-2">{year}</span>
        </div>
        
        <p className="text-gray-600 text-sm mt-1 line-clamp-1">
          <span className="font-medium">Director:</span> {director}
        </p>
        
        <p className="text-gray-600 text-sm mt-1 line-clamp-1">
          <span className="font-medium">Cast:</span> {actors.slice(0, 2).join(', ')}
          {actors.length > 2 ? '...' : ''}
        </p>
        
        <div className="mt-3 mb-1 flex flex-wrap gap-1">
          {genres.slice(0, 2).map((genre, index) => (
            <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 max-w-[100px] truncate">
              <span className="truncate">{genre}</span>
            </Badge>
          ))}
        </div>
        
        <div className="mt-auto pt-3 border-t border-gray-100 space-y-2">
          <p className="text-sm text-gray-700 leading-snug">
            <Award className="inline-block w-4 h-4 mr-1 text-primary" />
            <span className="text-primary font-medium">Why it matches:</span> {' '}
            <span className="text-gray-600">{film.matchReason || 'Matches your preferences'}</span>
          </p>
          
          {/* Streaming services availability - always show availability section */}
          <div className="text-sm">
            <span className="text-primary font-medium">Check availability on:</span>
            {film.availableOn && film.availableOn.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {film.availableOn.map((service, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 border-green-200 max-w-[100px] truncate">
                    <span className="truncate">{service}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-gray-500 text-xs italic">
                Try searching for this film on your preferred streaming services
              </div>
            )}
          </div>
          
          {/* Confirmation message after adding to watchlist */}
          {showConfirmation && (
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between bg-blue-50 p-2 rounded-md">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-blue-700 font-medium">Added to watchlist</span>
              </div>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setLocation("/watchlist")}
                className="text-blue-600 p-0 h-auto"
              >
                View
              </Button>
            </div>
          )}
          
          {/* Add to Watchlist button - show only for authenticated users and if not showing confirmation */}
          {user && !showConfirmation && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                size="sm"
                onClick={() => addToWatchlistMutation.mutate()}
                disabled={addToWatchlistMutation.isPending}
              >
                {addToWatchlistMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                )}
                Add to Watchlist
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
