import { useState, useEffect } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Film as FilmIcon, Star, Award, BookmarkPlus, BookmarkCheck, Loader2, Check, Clock, Globe, ThumbsUp, ThumbsDown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Link } from "wouter";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { useFilmFeedbackFirestore } from "@/hooks/use-film-feedback-firestore";
import { useWatchlistFirestore } from "@/hooks/use-watchlist-firestore";
import { useFeedbackInsight, FilmInsight } from "@/hooks/use-feedback-insight";
import { useEnhancedInsights, EnhancedFilmInsight } from "@/hooks/use-enhanced-insights";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Extend the RecommendationRequest type to include isOnboarding flag
interface OnboardingAwareRecommendationContext extends RecommendationRequest {
  isOnboarding?: boolean;
}

interface FilmCardProps {
  film: Film;
  recommendationContext?: OnboardingAwareRecommendationContext;
  onDisliked?: (filmId: number) => void;
  swipeMode?: boolean;
}

export default function FilmCard({ film, recommendationContext, onDisliked, swipeMode = false }: FilmCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // Removed usage of setLocation to prevent redirects when buttons are clicked
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'liked' | 'disliked' | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  
  // Debug: Log complete film object to see all fields
  console.log(`🎬 FRONTEND FULL DEBUG for "${film.title}":`, film);
  
  // Get Firestore hooks for film feedback and watchlist
  const filmFeedback = useFilmFeedbackFirestore();
  const watchlistFirestore = useWatchlistFirestore();
  
  // Feedback insight hook for personalized UI nudges
  const { getFilmInsight } = useFeedbackInsight();
  const [insight, setInsight] = useState<FilmInsight | null>(null);
  
  // Enhanced insights hook for improved "Because you liked X" badges
  const { getInsightForFilm, hasPreferenceData } = useEnhancedInsights();
  const [enhancedInsight, setEnhancedInsight] = useState<EnhancedFilmInsight | null>(null);
  
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
  
  // Load insight data for personalized nudges
  useEffect(() => {
    if (user && film && !isOnboarding) {
      getFilmInsight(film).then(result => {
        if (result) {
          setInsight(result);
        }
      }).catch(error => {
        console.error("Error loading film insight:", error);
      });
    }
  }, [film, user, isOnboarding, getFilmInsight]);

  // Load enhanced insights for better "Because you liked X" badges
  useEffect(() => {
    if (user && film && !isOnboarding && hasPreferenceData) {
      getInsightForFilm(film).then(result => {
        if (result) {
          setEnhancedInsight(result);
          console.log('Enhanced insight loaded:', result.reason);
        }
      }).catch(error => {
        console.error("Error loading enhanced insight:", error);
      });
    }
  }, [film, user, isOnboarding, hasPreferenceData, getInsightForFilm]);
  
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
        
        // First store to Firestore if user is logged in (to ensure this completes even if API fails)
        if (user) {
          try {
            await filmFeedback.saveFilmFeedback(
              user.id,
              film.id,
              {
                filmId: film.id,
                title: film.title,
                liked: feedback === 'like',
                timestamp: new Date().toISOString(),
                moodContext: recommendationContext?.mood || null,
                runtimePreference: recommendationContext?.runtime || null,
                recommendationContext: recommendationContext 
                  ? { ...recommendationContext } 
                  : null
              }
            );
          } catch (error) {
            console.error("Error saving feedback to Firestore:", error);
            // Don't throw - we'll continue with the API call
          }
        }
        
        // Use the onboarding-specific endpoint for ratings
        try {
          const res = await apiRequest("POST", "/api/onboarding/rate", {
            filmId: film.id,
            filmTitle: film.title,
            // Convert like/dislike to 5/1 star rating to match onboarding schema
            rating: feedback === 'like' ? 5 : 1,
            status: feedback === 'like' ? 'loved' : 'hated',
            isOnboarding: true
          });
          
          return await res.json();
        } catch (error) {
          console.error("Error saving onboarding rating via API:", error);
          // Return basic success even on API failure since we saved to Firestore
          return { success: true, feedbackSaved: true, source: 'firestore-only' };
        }
      } else {
        // Regular recommendation feedback - Save via API endpoint
        
        // Call the API endpoint
        try {
          const res = await apiRequest("POST", "/api/feedback", {
            filmId: film.id,
            filmTitle: film.title,
            feedback,
            recommendationContext: recommendationContext 
              ? { ...recommendationContext } 
              : null
          });
          
          return await res.json();
        } catch (error) {
          console.error("Error saving feedback via API:", error);
          // Return basic success even on API failure since we saved to Firestore
          return { success: true, feedbackSaved: true, source: 'firestore-only' };
        }
      }
    },
    onSuccess: (_data, variables) => {
      // ⚠️ DO NOT navigate or change routes here, it causes onboarding restart
      
      // Set feedback submitted state - just update local UI
      setFeedbackSubmitted(variables === 'like' ? 'liked' : 'disliked');
      
      // Show success toast with undo functionality
      toast({
        title: variables === 'like' ? "We'll recommend more like this" : "We'll show less like this",
        description: (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {variables === 'like' ? (
                <div className="bg-green-100 rounded-full p-1 mr-2">
                  <ThumbsUp className="h-3 w-3 text-green-600" />
                </div>
              ) : (
                <div className="bg-amber-100 rounded-full p-1 mr-2">
                  <ThumbsDown className="h-3 w-3 text-amber-600" />
                </div>
              )}
              <span>
                {variables === 'like' 
                  ? "Thanks for your feedback! We'll improve your recommendations." 
                  : "Thanks for letting us know. We'll adjust future recommendations."}
              </span>
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className={`ml-2 text-xs h-7 px-2 ${variables === 'like' ? 'border-green-200 hover:bg-green-50' : 'border-amber-200 hover:bg-amber-50'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Reset feedback state
                setFeedbackSubmitted(null);
                
                // Show confirmation toast
                toast({
                  title: "Feedback removed",
                  description: "Your feedback has been removed",
                  variant: "default",
                });
              }}
            >
              Undo
            </Button>
          </div>
        ),
        variant: "default",
      });
      
      // ⚠️ IMPORTANT: These comments explain what NOT to do to avoid the bug
      
      // 1. Do NOT navigate or redirect anywhere
      // 2. Do NOT call onDisliked which could cause the card to be removed
      //    and potentially trigger a state reset in the parent component
      // 3. Do NOT invalidate any global query cache during feedback flow
      // 4. Do NOT reset or clear any parent component state
      
      // Only update watchlist data if absolutely necessary, don't trigger a full refetch
      if (isWatchlisted) {
        // If the film is in watchlist, update its status only without refetching
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
          match_percentage: film.matchPercentage || 90,
          recommendation_source: film.source || 'unknown'
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
      
      // Show success toast with more engaging message and undo option
      toast({
        title: "Added to watchlist",
        description: (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="font-medium">"{film.title}"</span>
              <span className="ml-1">saved for later</span>
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className="ml-2 text-xs h-7 px-2 border-blue-200 hover:bg-blue-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                  // Find the watchlist item ID from the current watchlist data
                  const currentWatchlistItems = queryClient.getQueryData<any[]>(['/api/watchlist']) || [];
                  const watchlistItem = currentWatchlistItems.find(item => item.filmId === film.id);
                  
                  if (!watchlistItem) {
                    throw new Error("Watchlist item not found");
                  }
                  
                  // Remove from watchlist via API
                  const res = await apiRequest("DELETE", `/api/watchlist/${watchlistItem.id}`);
                  
                  // Update local state
                  setIsWatchlisted(false);
                  setShowConfirmation(false);
                  
                  // Update cache manually without triggering refetch
                  queryClient.setQueryData(['/api/watchlist'], (oldData: any[]) => {
                    if (!oldData || !Array.isArray(oldData)) return [];
                    return oldData.filter(item => item.filmId !== film.id);
                  });
                  
                  // Show confirmation
                  toast({
                    title: "Removed from watchlist",
                    description: `"${film.title}" was removed from your watchlist`,
                    variant: "default"
                  });
                } catch (error) {
                  console.error("Failed to remove from watchlist:", error);
                  toast({
                    title: "Error",
                    description: "Failed to remove from watchlist",
                    variant: "destructive"
                  });
                }
              }}
            >
              Undo
            </Button>
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

  // ─── Swipe-mode (mobile full-screen card) ────────────────────────────────
  if (swipeMode) {
    return (
      <div
        data-testid={`card-film-${film.id}`}
        className={`flex flex-col rounded-2xl overflow-hidden shadow-xl border bg-white dark:bg-zinc-900 w-full ${
          feedbackSubmitted === 'liked'
            ? 'border-green-300'
            : feedbackSubmitted === 'disliked'
            ? 'border-amber-300'
            : 'border-blue-100'
        }`}
      >
        {/* Poster / gradient header */}
        <div className="relative flex-shrink-0">
          {film.posterUrl && film.posterUrl.startsWith('http') ? (
            <div className="w-full h-64 relative overflow-hidden bg-blue-50">
              <img
                src={film.posterUrl}
                alt={`${title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const p = e.currentTarget.parentElement;
                  if (p) p.style.background = getBackgroundGradient();
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-2xl font-bold leading-tight">{title}</h3>
                <p className="text-white/80 text-sm mt-0.5">{year} · {director}</p>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-64 flex flex-col items-center justify-end p-4 text-white"
              style={{ background: getBackgroundGradient() }}
            >
              <FilmIcon className="w-10 h-10 text-white/60 mb-6" />
              <div className="w-full">
                <h3 className="text-2xl font-bold leading-tight">{title}</h3>
                <p className="text-white/80 text-sm mt-0.5">{year} · {director}</p>
              </div>
            </div>
          )}

          {/* Badges overlay – top left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            <Badge variant="outline" className="bg-white/90 text-gray-700 border-blue-200 text-xs px-2 py-0.5">
              {film.type === "indie" ? "Independent" : "Mainstream"}
            </Badge>
            {film.voteAverage && (
              <Badge variant="outline" className="bg-amber-50/90 text-amber-700 border-amber-200 text-xs px-2 py-0.5">
                <Star className="w-3 h-3 mr-0.5 text-amber-500 inline" />
                {film.voteAverage.toFixed(1)}/10
              </Badge>
            )}
          </div>

          {/* Match % badge – top right */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
            <Badge className="bg-primary text-white text-xs px-2 py-0.5">
              <Star className="w-3 h-3 mr-0.5 inline" />
              {matchPercentage}% Match
            </Badge>
            {film.runtime && (
              <Badge variant="outline" className="bg-blue-50/90 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                <Clock className="w-3 h-3 mr-0.5 inline" />
                {Math.floor(film.runtime / 60)}h {film.runtime % 60}m
              </Badge>
            )}
            {isWatchlisted && (
              <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-md">
                <BookmarkCheck className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Genre badges */}
            <div className="flex flex-wrap gap-1.5">
              {genres.map((genre, i) => (
                <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  {genre}
                </Badge>
              ))}
            </div>

            {/* Synopsis */}
            <p className="text-sm text-gray-700 leading-relaxed">{synopsis}</p>

            {/* Match reason */}
            <div className="flex items-start gap-1.5">
              <Award className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <span className="text-primary font-medium">Why it matches: </span>
                <span className="text-gray-600">{film.matchReason || 'Matches your preferences'}</span>
              </p>
            </div>

            {/* Taste-profile personalisation note (only when a fingerprint was active) */}
            {film.personalizationNote && (
              <div
                data-testid={`text-personalization-note-${film.id}`}
                className="flex items-start gap-1.5 rounded-md bg-purple-50 border border-purple-100 px-2.5 py-2"
              >
                <Star className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-800">{film.personalizationNote}</p>
              </div>
            )}

            {/* Cast */}
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">Cast:</span>{' '}
              {actors.slice(0, 3).join(', ')}
            </p>

            {/* Streaming */}
            {film.availableOn && film.availableOn.length > 0 && (
              <div>
                <p className="text-xs font-medium text-primary mb-1.5">Available on:</p>
                <div className="flex flex-wrap gap-1.5">
                  {film.availableOn.filter((s, i, arr) => arr.indexOf(s) === i).map((service, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback submitted state */}
            {feedbackSubmitted && (
              <div className={`rounded-lg p-3 flex items-center justify-between ${
                feedbackSubmitted === 'liked' ? 'bg-green-50' : 'bg-amber-50'
              }`}>
                <div className="flex items-center gap-2">
                  {feedbackSubmitted === 'liked'
                    ? <ThumbsUp className="h-4 w-4 text-green-600" />
                    : <ThumbsDown className="h-4 w-4 text-amber-600" />}
                  <span className={`text-sm font-medium ${feedbackSubmitted === 'liked' ? 'text-green-700' : 'text-amber-700'}`}>
                    {feedbackSubmitted === 'liked' ? "We'll recommend more like this." : "We'll show fewer like this."}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={(e) => { e.preventDefault(); setFeedbackSubmitted(null); }}
                >
                  Undo
                </Button>
              </div>
            )}

            {/* Watchlist confirmation */}
            {showConfirmation && (
              <div className="rounded-lg bg-blue-50 p-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-700 font-medium">Added to watchlist!</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="border-t bg-white dark:bg-zinc-900 px-4 py-3 flex gap-2">
          {/* Dislike */}
          <Button
            data-testid={`button-dislike-${film.id}`}
            variant="outline"
            type="button"
            className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700 text-sm h-11"
            onClick={(e) => { e.preventDefault(); recommendationFeedbackMutation.mutate('dislike'); }}
            disabled={recommendationFeedbackMutation.isPending || !!feedbackSubmitted}
          >
            <ThumbsDown className="w-4 h-4 mr-1.5 text-red-400" />
            Skip
          </Button>

          {/* Watchlist */}
          <Button
            data-testid={`button-watchlist-${film.id}`}
            variant={isWatchlisted ? "default" : "outline"}
            type="button"
            className={`flex-1 h-11 text-sm ${isWatchlisted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}
            onClick={(e) => {
              e.preventDefault();
              if (!isWatchlisted) addToWatchlistMutation.mutate();
            }}
            disabled={addToWatchlistMutation.isPending}
          >
            {isWatchlisted ? (
              <><BookmarkCheck className="w-4 h-4 mr-1.5" />Saved</>
            ) : addToWatchlistMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving</>
            ) : (
              <><BookmarkPlus className="w-4 h-4 mr-1.5" />Save</>
            )}
          </Button>

          {/* Like */}
          <Button
            data-testid={`button-like-${film.id}`}
            variant="outline"
            type="button"
            className="flex-1 border-green-200 hover:bg-green-50 hover:text-green-700 text-sm h-11"
            onClick={(e) => { e.preventDefault(); recommendationFeedbackMutation.mutate('like'); }}
            disabled={recommendationFeedbackMutation.isPending || !!feedbackSubmitted}
          >
            <ThumbsUp className="w-4 h-4 mr-1.5 text-green-500" />
            Like
          </Button>
        </div>
      </div>
    );
  }
  // ─── End swipe mode ───────────────────────────────────────────────────────

  return (
    <Card className={`recommendation-card bg-white rounded-lg overflow-hidden shadow-[0_4px_14px_0_rgba(59,130,246,0.2)] border group hover:shadow-[0_8px_20px_0_rgba(59,130,246,0.25)] transition-all duration-200 h-full flex flex-col ${
      feedbackSubmitted ? 
        (feedbackSubmitted === 'liked' 
          ? 'border-green-300 opacity-95 shadow-[0_0_8px_rgba(74,222,128,0.4)]' 
          : 'border-amber-300 opacity-95 shadow-[0_0_8px_rgba(251,191,36,0.4)]') 
        : 'border-blue-100'
    }`}>
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
                  
                  // Create fallback content safely using DOM manipulation
                  const fallbackDiv = document.createElement('div');
                  fallbackDiv.className = 'flex flex-col items-center justify-center h-full text-center p-4';
                  
                  // Create and append SVG icon
                  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  svg.setAttribute('class', 'w-10 h-10 text-white/80 mb-4');
                  svg.setAttribute('viewBox', '0 0 24 24');
                  svg.setAttribute('fill', 'none');
                  svg.setAttribute('stroke', 'currentColor');
                  svg.setAttribute('stroke-width', '2');
                  svg.setAttribute('stroke-linecap', 'round');
                  svg.setAttribute('stroke-linejoin', 'round');
                  
                  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  path1.setAttribute('d', 'm22 8-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z');
                  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  path2.setAttribute('d', 'M18 8h-6V2');
                  
                  svg.appendChild(path1);
                  svg.appendChild(path2);
                  fallbackDiv.appendChild(svg);
                  
                  // Create and append title (safely)
                  const titleElement = document.createElement('h3');
                  titleElement.className = 'text-xl md:text-2xl font-bold text-white mb-1';
                  titleElement.textContent = title; // Safe text assignment
                  fallbackDiv.appendChild(titleElement);
                  
                  // Create and append year (safely)
                  const yearElement = document.createElement('p');
                  yearElement.className = 'text-white/90 font-medium';
                  yearElement.textContent = year; // Safe text assignment
                  fallbackDiv.appendChild(yearElement);
                  
                  // Create and append director (safely)
                  const directorElement = document.createElement('p');
                  directorElement.className = 'text-white/70 text-sm mt-2';
                  directorElement.textContent = director; // Safe text assignment
                  fallbackDiv.appendChild(directorElement);
                  
                  // Clear parent and append safe content
                  parentElement.innerHTML = '';
                  parentElement.appendChild(fallbackDiv);
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
        
        {/* Watchlist indicator - only show if film is in watchlist */}
        {isWatchlisted && (
          <div className="absolute top-2 right-2 z-20">
            <div className="bg-blue-600 text-white p-1.5 rounded-full animate-in fade-in-50 shadow-md" title="In your watchlist">
              <BookmarkCheck className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
        
        {/* Match percentage badge - position adjusted if watchlist indicator is present */}
        <div className={`absolute ${isWatchlisted ? 'top-2 right-8' : 'top-2 right-2'} z-10 max-w-[42%]`}>
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
          

          
          {/* Personalized insight badge */}
          {insight && !isOnboarding && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary"
                    className="flex items-center gap-1 cursor-help bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full"
                    onClick={(e) => {
                      // Track when a user clicks on an insight badge
                      trackEvent('recommendation_clicked_with_insight', {
                        filmId: film.id,
                        filmTitle: film.title,
                        hasInsight: true,
                        insightType: insight.matchReason || 'unspecified',
                        relatedFilmId: insight.relatedFilmId
                      });
                    }}
                  >
                    <Info className="h-3 w-3" />
                    <span className="text-xs truncate max-w-[120px]">{insight.message}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p className="text-xs">This film shares a similar {insight.matchReason || 'theme'} with one you liked</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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

          {/* Taste-profile personalisation note (only when a fingerprint was active) */}
          {film.personalizationNote && (
            <div
              data-testid={`text-personalization-note-${film.id}`}
              className="flex items-start gap-1.5 rounded-md bg-purple-50 border border-purple-100 px-2.5 py-2"
            >
              <Star className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-800">{film.personalizationNote}</p>
            </div>
          )}
          
          {/* Streaming services availability - always show availability section */}
          <div className="text-sm">
            <span className="text-primary font-medium">
              {film.availableOn && film.availableOn.length > 0 ? 'Available on:' : 'Streaming availability:'}
            </span>
            {film.availableOn && film.availableOn.length > 0 ? (
              // Film is available on user's streaming services
              <>
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* Remove duplicates by using Array.filter for uniqueness */}
                  {(film.availableOn || []).filter((service, index, self) => 
                    self.indexOf(service) === index
                  ).map((service, index) => {
                    // Check if this is a rental/purchase service
                    const isRental = ['itunes', 'google play', 'rakuten', 'youtube', 'microsoft store', 'sky store', 'vudu'].some(rental => 
                      service.toLowerCase().includes(rental)
                    );
                    
                    // Get service logo URL for better visual distinction
                    const getServiceLogo = (serviceName: string) => {
                      const name = serviceName.toLowerCase();
                      const baseUrl = 'https://logo.clearbit.com';
                      
                      if (name.includes('netflix')) return `${baseUrl}/netflix.com`;
                      if (name.includes('amazon') || name.includes('prime')) return `${baseUrl}/amazon.com`;
                      if (name.includes('disney')) return `${baseUrl}/disneyplus.com`;
                      if (name.includes('apple') || name.includes('itunes')) return `${baseUrl}/apple.com`;
                      if (name.includes('google')) return `${baseUrl}/google.com`;
                      if (name.includes('youtube')) return `${baseUrl}/youtube.com`;
                      if (name.includes('sky')) return `${baseUrl}/sky.com`;
                      if (name.includes('bbc')) return `${baseUrl}/bbc.co.uk`;
                      if (name.includes('hbo')) return `${baseUrl}/hbo.com`;
                      if (name.includes('paramount')) return `${baseUrl}/paramount.com`;
                      if (name.includes('mubi')) return `${baseUrl}/mubi.com`;
                      if (name.includes('rakuten')) return `${baseUrl}/rakuten.com`;
                      if (name.includes('hulu')) return `${baseUrl}/hulu.com`;
                      if (name.includes('peacock')) return `${baseUrl}/peacocktv.com`;
                      if (name.includes('crunchyroll')) return `${baseUrl}/crunchyroll.com`;
                      if (name.includes('discovery')) return `${baseUrl}/discovery.com`;
                      if (name.includes('britbox')) return `${baseUrl}/britbox.com`;
                      if (name.includes('hayu')) return `${baseUrl}/hayu.com`;
                      if (name.includes('vudu')) return `${baseUrl}/vudu.com`;
                      if (name.includes('microsoft')) return `${baseUrl}/microsoft.com`;
                      
                      // Default streaming icon for unrecognized services
                      return null;
                    };
                    
                    const logoUrl = getServiceLogo(service);
                    
                    return (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className={`${isRental 
                          ? 'bg-blue-100 text-blue-800 border-blue-200' 
                          : 'bg-green-100 text-green-800 border-green-200'
                        } max-w-[140px] truncate flex items-center gap-2`}
                        title={isRental ? 'Available for rental/purchase' : 'Available on subscription'}
                      >
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt={`${service} logo`}
                            className="w-4 h-4 rounded-sm object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-xs">{isRental ? '💳' : '📺'}</span>
                        )}
                        <span className="truncate text-xs font-medium">{service}</span>
                      </Badge>
                    );
                  })}
                </div>
                {/* Add helpful text about rental options */}
                {film.availableOn.some(service => 
                  ['itunes', 'google play', 'rakuten', 'youtube', 'microsoft store', 'sky store', 'vudu'].some(rental => 
                    service.toLowerCase().includes(rental)
                  )
                ) && (
                  <div className="mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    💳 Available for digital rental or purchase
                  </div>
                )}
              </>
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
          
          {/* Recommendation feedback buttons - show for all recommendations */}
          {!feedbackSubmitted && (
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
              <div className={`p-2 rounded-md flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                feedbackSubmitted === 'liked' ? 'bg-green-50' : 'bg-amber-50'
              }`}>
                <div className="flex items-center">
                  {feedbackSubmitted === 'liked' ? (
                    <div className="bg-green-100 rounded-full p-1 mr-2 animate-pulse">
                      <ThumbsUp className="h-3 w-3 text-green-600" />
                    </div>
                  ) : (
                    <div className="bg-amber-100 rounded-full p-1 mr-2 animate-pulse">
                      <ThumbsDown className="h-3 w-3 text-amber-600" />
                    </div>
                  )}
                  <span className={`text-sm ${feedbackSubmitted === 'liked' ? 'text-green-700' : 'text-amber-700'} font-medium`}>
                    {feedbackSubmitted === 'liked' 
                      ? "Thanks! We'll recommend more like this."
                      : "Thanks! We'll show fewer like this."}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`text-xs ${feedbackSubmitted === 'liked' ? 'text-green-700 hover:bg-green-100' : 'text-amber-700 hover:bg-amber-100'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Reset feedback state
                    setFeedbackSubmitted(null);
                    
                    // Show toast for undo action
                    toast({
                      title: "Feedback removed",
                      description: "Your feedback has been removed",
                      variant: "default",
                    });
                  }}
                >
                  Undo
                </Button>
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
                    // Prevent default behavior to avoid any form submissions or navigations
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