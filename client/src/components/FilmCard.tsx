import { useState, useEffect } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Film as FilmIcon, Star, Award, BookmarkPlus, BookmarkCheck, Loader2, Check, Clock, Globe, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Link } from "wouter";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

// Extend the RecommendationRequest type to include isOnboarding flag
interface OnboardingAwareRecommendationContext extends RecommendationRequest {
  isOnboarding?: boolean;
}

interface FilmCardProps {
  film: Film;
  recommendationContext?: OnboardingAwareRecommendationContext;
  onDisliked?: (filmId: number) => void;
}

export default function FilmCard({ film, recommendationContext, onDisliked }: FilmCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Removed usage of setLocation to prevent redirects when buttons are clicked
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'liked' | 'disliked' | null>(null);
  
  // Use react-query to manage watchlist state instead of direct fetch
  const { data: watchlistItems = [] } = useQuery<any[]>({
    queryKey: ['/api/watchlist'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // Only run query if user is logged in
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
  
  // Use a single state for tracking watchlist status
  const [isWatchlisted, setIsWatchlisted] = useState<boolean>(false);
  
  // Check if film is in watchlist once on initial render and when watchlist items change
  useEffect(() => {
    if (!watchlistItems || !Array.isArray(watchlistItems)) return;
    
    const inWatchlist = watchlistItems.some(
      (item: any) => item && 
        item.filmId === film.id && 
        item.filmTitle.toLowerCase() === film.title.toLowerCase()
    );
    
    setIsWatchlisted(inWatchlist);
  }, [watchlistItems, film.id, film.title]);

  // Check if this specific film is in the watchlist using BOTH id and title to be extra safe
  const exactFilmInWatchlist = Array.isArray(watchlistItems) && watchlistItems.some(
    (item: any) => {
      // Check if both filmId and filmTitle match to be absolutely certain
      return item && 
        item.filmId === film.id && 
        item.filmTitle.toLowerCase() === film.title.toLowerCase();
    }
  );
  
  // Update state whenever watchlist items change
  useEffect(() => {
    setIsWatchlisted(!!exactFilmInWatchlist);
  }, [exactFilmInWatchlist]);
  
  // Check if this is part of onboarding flow
  const isOnboardingContext = recommendationContext && 
    (recommendationContext as any)?.isOnboarding === true;

  // Recommendation feedback mutation
  const recommendationFeedbackMutation = useMutation({
    mutationFn: async (feedback: 'like' | 'dislike') => {
      // Use different endpoint during onboarding to avoid conflicts
      if (isOnboardingContext) {
        console.log('Submitting onboarding feedback:', { 
          filmId: film.id, 
          feedback, 
          isOnboarding: true 
        });
        
        // Use the onboarding-specific endpoint for ratings
        const res = await apiRequest("POST", "/api/onboarding/rate", {
          filmId: film.id,
          filmTitle: film.title,
          // Convert like/dislike to 5/1 star rating to match onboarding schema
          rating: feedback === 'like' ? 5 : 1,
          status: feedback === 'like' ? 'loved' : 'hated',
          isOnboarding: true
        });
        return await res.json();
      } else {
        // Regular recommendation feedback
        const res = await apiRequest("POST", "/api/feedback", {
          filmId: film.id,
          filmTitle: film.title,
          feedback,
          recommendationContext
        });
        return await res.json();
      }
    },
    onSuccess: (_data, variables) => {
      // Set feedback submitted state
      setFeedbackSubmitted(variables === 'like' ? 'liked' : 'disliked');
      
      // Show success toast
      toast({
        title: variables === 'like' ? "We'll recommend more like this" : "We'll show less like this",
        description: variables === 'like' 
          ? "Thanks for your feedback! We'll improve your recommendations." 
          : "Thanks for letting us know. We'll adjust future recommendations.",
      });
      
      // Do NOT call onDisliked which could cause the card to be removed
      // and potentially trigger a state reset in the parent component
      // This was causing the recommendations to reset
      
      // Do NOT invalidate the onboarding queries during active recommendation flow
      // The previous invalidation was causing the entire recommendation list to reset
      
      // Only update watchlist data if absolutely necessary, don't trigger a full refetch
      if (isWatchlisted) {
        // If the film is in watchlist, update its status only
        queryClient.setQueryData(['/api/watchlist'], (oldData: any[]) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map(item => {
            if (item.filmId === film.id) {
              return { ...item, userRating: variables === 'like' ? 5 : 1 };
            }
            return item;
          });
        });
      }
      
      // Track feedback event
      trackEvent(
        variables === 'like' ? AnalyticsEvents.RECOMMENDATION_LIKED : AnalyticsEvents.RECOMMENDATION_DISLIKED, 
        {
          film_id: film.id,
          film_title: film.title,
          film_year: film.year,
          film_type: film.type,
          film_genres: film.genres.join(','),
          rating: variables === 'like' ? 'positive' : 'negative',
          match_percentage: film.matchPercentage || 90
        }
      );
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to submit feedback: ${error.message}`,
        variant: "destructive",
      });
    },
  });

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
        // TMDB specific fields
        tmdbId: film.tmdbId,
        voteAverage: film.voteAverage,
        runtime: film.runtime,
        originalLanguage: film.originalLanguage,
        releaseDate: film.releaseDate,
        // Default to unwatched when adding to watchlist
        watched: false
      });
      return await res.json();
    },
    onSuccess: (watchlistItem) => {
      // Immediately update our local state
      setIsWatchlisted(true);
      
      // IMPORTANT: Do NOT invalidate queries during recommendation flow
      // This was causing the entire screen to refresh/reset
      // Instead, manually update the cache without triggering a refetch
      queryClient.setQueryData(['/api/watchlist'], (oldData: any[]) => {
        if (!oldData || !Array.isArray(oldData)) {
          return [watchlistItem];
        }
        
        // Check if film already exists in watchlist
        const existingIndex = oldData.findIndex(item => 
          item && item.filmId === film.id
        );
        
        if (existingIndex >= 0) {
          // Update existing item
          return oldData.map((item, index) => 
            index === existingIndex ? watchlistItem : item
          );
        } else {
          // Add new item
          return [...oldData, watchlistItem];
        }
      });
      
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
      
      // Show success toast with more engaging message
      toast({
        title: "Added to watchlist",
        description: (
          <div className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-green-500" />
            <span className="font-medium">"{film.title}"</span>
            <span className="ml-1">saved for later</span>
          </div>
        ),
        variant: "default",
      });
      
      // Show confirmation message within the card with improved animation
      setShowConfirmation(true);
      
      // Auto-hide confirmation after 6 seconds (slightly longer for better UX)
      setTimeout(() => {
        setShowConfirmation(false);
      }, 6000);
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
        {/* Warning badge for incomplete data */}
        {film.hasCompleteData === false && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20 max-w-[80%]">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] sm:text-xs px-2 py-0.5 max-w-full truncate">
              <span className="truncate">Limited information available</span>
            </Badge>
          </div>
        )}
        
        {/* Poster image or fallback gradient background */}
        {film.posterUrl && film.posterUrl.startsWith('http') ? (
          <div className="w-full h-72 bg-blue-50 relative overflow-hidden">
            <img 
              src={film.posterUrl} 
              alt={`${title} poster`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // If image fails to load, replace with gradient background
                e.currentTarget.style.display = 'none';
                const parentElement = e.currentTarget.parentElement;
                if (parentElement) {
                  parentElement.style.background = getBackgroundGradient();
                  parentElement.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-center p-4">
                      <svg class="w-10 h-10 text-white/80 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m22 8-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                        <path d="M18 8h-6V2"/>
                      </svg>
                      <h3 class="text-xl md:text-2xl font-bold text-white mb-1">${title}</h3>
                      <p class="text-white/90 font-medium">${year}</p>
                      <p class="text-white/70 text-sm mt-2">${director}</p>
                    </div>
                  `;
                }
              }}
            />
            {/* Darkening overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40"></div>
            {/* Film info overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{title}</h3>
              <p className="text-white/90 font-medium">{year}</p>
              <p className="text-white/70 text-sm mt-1">{director}</p>
            </div>
          </div>
        ) : (
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
        )}
        
        {/* Match percentage badge */}
        <div className="absolute top-2 right-2 z-10 max-w-[42%]">
          <Badge className="bg-primary text-white px-1.5 py-0.5 text-[10px] sm:text-xs sm:px-2 sm:py-0.5 font-medium max-w-full truncate">
            <Star className="w-3 h-3 mr-0.5 sm:mr-1 inline flex-shrink-0" />
            <span className="truncate">{matchPercentage}% Match</span>
          </Badge>
          
          {/* Runtime badge - below the match percentage */}
          {film.runtime ? (
            <div className="mt-1">
              <Badge variant="outline" className="bg-blue-50/90 text-blue-700 border-blue-200 px-1.5 py-0.5 text-[10px] sm:text-xs sm:px-2 sm:py-0.5 max-w-full truncate">
                <Clock className="w-3 h-3 mr-0.5 sm:mr-1 inline flex-shrink-0" />
                <span className="truncate">{Math.floor(film.runtime / 60)}h {film.runtime % 60}m</span>
              </Badge>
            </div>
          ) : null}
        </div>
        
        {/* Film type and TMDB rating badges */}
        <div className="absolute top-2 left-2 z-10 max-w-[42%] flex flex-col gap-1">
          {/* Film type */}
          <Badge variant="outline" className="bg-white/90 text-gray-700 border-blue-200 px-1.5 py-0.5 text-[10px] sm:text-xs sm:px-2 sm:py-0.5 max-w-full truncate">
            <span className="truncate">{film.type === "indie" ? "Independent" : "Mainstream"}</span>
          </Badge>
          
          {/* TMDB rating */}
          {film.voteAverage && (
            <Badge variant="outline" className="bg-amber-50/90 text-amber-700 border-amber-200 px-1.5 py-0.5 text-[10px] sm:text-xs sm:px-2 sm:py-0.5 max-w-full truncate">
              <Star className="w-3 h-3 mr-0.5 sm:mr-1 text-amber-500 inline flex-shrink-0" />
              <span className="truncate">{film.voteAverage.toFixed(1)}/10</span>
            </Badge>
          )}
        </div>
        
        <div className="recommendation-details absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent p-3 md:p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-black/50 backdrop-blur-sm rounded p-3 mb-2">
            <h3 className="text-lg md:text-xl font-bold text-white">{title}</h3>
            <p className="text-gray-200 text-xs md:text-sm mb-2">
              {year} • {director}
              {film.runtime && <span> • {Math.floor(film.runtime / 60)}h {film.runtime % 60}m</span>}
            </p>
            <p className="text-xs md:text-sm text-white leading-snug line-clamp-4">{synopsis}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {genres.map((genre, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-500/80 text-white text-xs px-1.5 py-0.5 max-w-[90px] truncate">
                  <span className="truncate">{genre}</span>
                </Badge>
              ))}
            </div>
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
          {/* TMDB Additional Info - Always show this section */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
            {film.runtime ? (
              <div className="flex items-center bg-blue-50 p-1 rounded">
                <Clock className="w-3 h-3 mr-1 text-blue-500" />
                <span className="font-medium">{Math.floor(film.runtime / 60)}h {film.runtime % 60}m</span>
              </div>
            ) : (
              <div className="flex items-center p-1">
                <Clock className="w-3 h-3 mr-1 text-gray-300" />
                <span className="text-gray-400">Runtime N/A</span>
              </div>
            )}
            
            {film.voteAverage ? (
              <div className="flex items-center bg-amber-50 p-1 rounded">
                <Star className="w-3 h-3 mr-1 text-amber-500" />
                <span className="font-medium">{film.voteAverage.toFixed(1)}/10</span>
              </div>
            ) : null}
            
            {film.originalLanguage && (
              <div className="flex items-center bg-gray-50 p-1 rounded">
                <Globe className="w-3 h-3 mr-1 text-gray-500" />
                <span>{film.originalLanguage.toUpperCase()}</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-700 leading-snug">
            <Award className="inline-block w-4 h-4 mr-1 text-primary" />
            <span className="text-primary font-medium">Why it matches:</span> {' '}
            <span className="text-gray-600">{film.matchReason || 'Matches your preferences'}</span>
          </p>
          
          {/* Streaming services availability - always show availability section */}
          <div className="text-sm">
            <span className="text-primary font-medium">
              {film.availableOn && film.availableOn.length > 0 ? 'Available on:' : 'Streaming availability:'}
            </span>
            {film.availableOn && film.availableOn.length > 0 ? (
              // Film is available on user's streaming services
              <div className="flex flex-wrap gap-1 mt-1">
                {/* Remove duplicates by using Array.filter for uniqueness */}
                {(film.availableOn || []).filter((service, index, self) => 
                  self.indexOf(service) === index
                ).map((service, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 border-green-200 max-w-[100px] truncate">
                    <span className="truncate">{service}</span>
                  </Badge>
                ))}
              </div>
            ) : film.hasStreamingData ? (
              // We have streaming data, but film isn't on user's services
              <div className="mt-1 text-gray-500 text-xs italic">
                Not available on your selected streaming services
              </div>
            ) : film.tmdbId ? (
              // We have TMDB data but no streaming info for this country
              <div className="mt-1 text-gray-500 text-xs italic">
                Streaming info not available for your country
              </div>
            ) : (
              // No TMDB data at all
              <div className="mt-1 text-gray-500 text-xs italic">
                Streaming information not available
              </div>
            )}
          </div>
          
          {/* Enhanced confirmation message after adding to watchlist - with animation */}
          {showConfirmation && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-md shadow-sm animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full p-1.5 mr-1 animate-pulse">
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-blue-700 font-semibold">Added to watchlist!</span>
                      <span className="text-xs text-blue-500">Watch this film later</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    type="button"
                    size="sm" 
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 transition-colors rounded-full"
                    onClick={(e) => {
                      // Prevent default behavior
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Instead of redirecting, show an informative message
                      toast({
                        title: "Watchlist Access",
                        description: "You can view all your saved films in the Watchlist tab anytime",
                      });
                    }}
                  >
                    View Later
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Recommendation feedback buttons - show only when recommendation context exists */}
          {recommendationContext && !feedbackSubmitted && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-center text-sm text-gray-500 mb-2">
                Was this a good recommendation?
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  className="flex-1 border-green-200 hover:bg-green-50 hover:text-green-700"
                  onClick={(e) => {
                    // Prevent default behavior to avoid any form submissions
                    e.preventDefault();
                    recommendationFeedbackMutation.mutate('like');
                  }}
                  disabled={recommendationFeedbackMutation.isPending}
                >
                  <ThumbsUp className="mr-1 h-4 w-4 text-green-500" />
                  <span>Yes</span>
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={(e) => {
                    // Prevent default behavior to avoid any form submissions
                    e.preventDefault();
                    recommendationFeedbackMutation.mutate('dislike');
                  }}
                  disabled={recommendationFeedbackMutation.isPending}
                >
                  <ThumbsDown className="mr-1 h-4 w-4 text-red-500" />
                  <span>No</span>
                </Button>
              </div>
            </div>
          )}
          
          {/* Enhanced feedback submitted confirmation with animation */}
          {feedbackSubmitted && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className={`p-2 rounded-md flex items-center animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                feedbackSubmitted === 'liked' ? 'bg-green-50' : 'bg-amber-50'
              }`}>
                {feedbackSubmitted === 'liked' ? (
                  <div className="bg-green-100 rounded-full p-1 mr-2">
                    <ThumbsUp className="h-3 w-3 text-green-600" />
                  </div>
                ) : (
                  <div className="bg-amber-100 rounded-full p-1 mr-2">
                    <ThumbsDown className="h-3 w-3 text-amber-600" />
                  </div>
                )}
                <span className={`text-sm ${feedbackSubmitted === 'liked' ? 'text-green-700' : 'text-amber-700'} font-medium`}>
                  {feedbackSubmitted === 'liked' 
                    ? "Thanks! We'll recommend more like this."
                    : "Thanks! We'll show fewer like this."}
                </span>
              </div>
              {/* Only show this message when the film hasn't been added to the watchlist */}
              {!isWatchlisted && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  <span className="font-medium">Note:</span> This film hasn't been added to your watchlist yet. 
                  {feedbackSubmitted === 'liked' && " Use the 'Add to Watchlist' button below to save it for later."}
                </div>
              )}
              {/* Add to watchlist button if user liked the film but it's not yet in the watchlist */}
              {feedbackSubmitted === 'liked' && !isWatchlisted && (
                <Button 
                  className="w-full mt-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    // Prevent default behavior
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Use current state to determine if item is in watchlist
                    if (isWatchlisted) {
                      setIsWatchlisted(true);
                      toast({
                        title: "Already in your watchlist",
                        description: "This film is already saved to your watchlist",
                      });
                    } else {
                      // Add to watchlist without resetting state
                      addToWatchlistMutation.mutate();
                    }
                  }}
                  disabled={addToWatchlistMutation.isPending}
                >
                  {addToWatchlistMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                  )}
                  Add to Watchlist
                </Button>
              )}
            </div>
          )}
          
          {/* Add to Watchlist button or Already in Watchlist indicator */}
          {user && !showConfirmation && !feedbackSubmitted && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              {exactFilmInWatchlist ? (
                <div className="flex items-center justify-center bg-blue-50 text-blue-700 p-2 rounded-md animate-in fade-in-25 duration-300">
                  <BookmarkCheck className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">In Your Watchlist</span>
                  <Button 
                    variant="link"
                    type="button"
                    size="sm"
                    className="ml-2 pl-2 text-xs text-blue-600 hover:text-blue-700 border-l border-blue-200"
                    onClick={() => {
                      // Instead of direct navigation which resets the page, show a toast
                      toast({
                        title: "Watchlist Access",
                        description: "You can view all your saved films in the Watchlist tab when you're done here"
                      });
                    }}
                  >
                    View Later
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 shadow-sm hover:shadow transition-all"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    // Prevent default to avoid form submissions
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Use current state to determine if item is in watchlist
                    if (isWatchlisted) {
                      setIsWatchlisted(true);
                      toast({
                        title: "Already in your watchlist",
                        description: "This film is already saved to your watchlist",
                        variant: "default"
                      });
                    } else {
                      // Track click event
                      trackEvent(AnalyticsEvents.FILM_ACTION_CLICKED, {
                        film_id: film.id,
                        action: 'add_to_watchlist',
                        from_page: window.location.pathname
                      });
                      
                      // Add to watchlist
                      addToWatchlistMutation.mutate();
                    }
                  }}
                  disabled={addToWatchlistMutation.isPending}
                >
                  {addToWatchlistMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                  )}
                  Add to Watchlist
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}