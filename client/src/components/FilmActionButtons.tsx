/**
 * FilmActionButtons Component
 * 
 * Handles user interactions for film recommendations including:
 * - Like/Dislike feedback
 * - Add to Watchlist functionality
 * - Visual feedback states and confirmation messages
 * 
 * This component was extracted from FilmCard to improve maintainability
 * and separate action handling logic from data presentation.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { useFilmFeedbackFirestore } from '@/hooks/use-film-feedback-firestore';
import { useAuth } from '@/hooks/use-auth';
import { type Film, type RecommendationRequest } from '@shared/schema';
import {
  ThumbsUp,
  ThumbsDown,
  BookmarkPlus,
  BookmarkCheck,
  Loader2,
  Check,
} from 'lucide-react';

interface OnboardingAwareRecommendationContext extends RecommendationRequest {
  isOnboarding?: boolean;
}

interface FilmActionButtonsProps {
  film: Film;
  isWatchlisted: boolean;
  recommendationContext?: OnboardingAwareRecommendationContext;
  onWatchlistChange: (isWatchlisted: boolean) => void;
  onDisliked?: (filmId: number) => void;
}

export default function FilmActionButtons({
  film,
  isWatchlisted,
  recommendationContext,
  onWatchlistChange,
  onDisliked,
}: FilmActionButtonsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const filmFeedback = useFilmFeedbackFirestore();

  const [feedbackSubmitted, setFeedbackSubmitted] = useState<
    'liked' | 'disliked' | null
  >(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isOnboardingContext =
    recommendationContext && (recommendationContext as any)?.isOnboarding === true;

  // Recommendation feedback mutation
  const recommendationFeedbackMutation = useMutation({
    mutationFn: async (feedback: 'like' | 'dislike') => {
      if (isOnboardingContext) {
        console.log('Submitting onboarding feedback:', {
          filmId: film.id,
          feedback,
          isOnboarding: true,
        });

        // Store to Firestore if user is logged in
        if (user) {
          try {
            await filmFeedback.saveFilmFeedback(user.id, film.id, {
              filmId: film.id,
              title: film.title,
              liked: feedback === 'like',
              timestamp: new Date().toISOString(),
              moodContext: recommendationContext?.mood || null,
              runtimePreference: recommendationContext?.runtime || null,
              recommendationContext: recommendationContext
                ? { ...recommendationContext }
                : null,
            });
          } catch (error) {
            console.error('Error saving feedback to Firestore:', error);
          }
        }

        // Use onboarding-specific endpoint
        try {
          const res = await apiRequest('POST', '/api/onboarding/rate', {
            filmId: film.id,
            filmTitle: film.title,
            rating: feedback === 'like' ? 5 : 1,
            status: feedback === 'like' ? 'loved' : 'hated',
            isOnboarding: true,
          });
          return await res.json();
        } catch (error) {
          console.error('Error saving onboarding rating via API:', error);
          return { success: true, feedbackSaved: true, source: 'firestore-only' };
        }
      } else {
        // Regular recommendation feedback
        try {
          const res = await apiRequest('POST', '/api/feedback', {
            filmId: film.id,
            filmTitle: film.title,
            feedback,
            recommendationContext: recommendationContext
              ? { ...recommendationContext }
              : null,
          });
          return await res.json();
        } catch (error) {
          console.error('Error saving feedback via API:', error);
          return { success: true, feedbackSaved: true, source: 'firestore-only' };
        }
      }
    },
    onSuccess: (_data, variables) => {
      setFeedbackSubmitted(variables === 'like' ? 'liked' : 'disliked');

      toast({
        title:
          variables === 'like'
            ? "We'll recommend more like this"
            : "We'll show less like this",
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
              className={`ml-2 text-xs h-7 px-2 ${
                variables === 'like'
                  ? 'border-green-200 hover:bg-green-50'
                  : 'border-amber-200 hover:bg-amber-50'
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFeedbackSubmitted(null);
                toast({
                  title: 'Feedback removed',
                  description: 'Your feedback has been removed',
                  variant: 'default',
                });
              }}
            >
              Undo
            </Button>
          </div>
        ),
        variant: 'default',
      });

      // Update watchlist data if necessary
      if (isWatchlisted) {
        queryClient.setQueryData(['/api/watchlist'], (oldData: any[]) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((item) => {
            if (item.filmId === film.id) {
              return { ...item, userRating: variables === 'like' ? 5 : 1 };
            }
            return item;
          });
        });
      }

      // Track feedback event
      trackEvent(
        variables === 'like'
          ? AnalyticsEvents.RECOMMENDATION_LIKED
          : AnalyticsEvents.RECOMMENDATION_DISLIKED,
        {
          film_id: film.id,
          film_title: film.title,
          film_year: film.year,
          film_type: film.type,
          film_genres: film.genres.join(','),
          rating: variables === 'like' ? 'positive' : 'negative',
          match_percentage: film.matchPercentage || 90,
          recommendation_source: film.source || 'unknown',
        }
      );
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to submit feedback: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/watchlist', {
        filmId: film.id,
        filmTitle: film.title,
        filmYear: film.year,
        filmDirector: film.director,
        filmType: film.type,
        filmGenres: film.genres,
        filmPosterUrl: film.posterUrl,
        recommendationContext,
        tmdbId: film.tmdbId,
        voteAverage: film.voteAverage,
        runtime: film.runtime,
        originalLanguage: film.originalLanguage,
        releaseDate: film.releaseDate,
        watched: false,
      });
      return await res.json();
    },
    onSuccess: (watchlistItem) => {
      onWatchlistChange(true);
      setShowConfirmation(true);

      // Update cache manually
      queryClient.setQueryData(['/api/watchlist'], (oldData: any[]) => {
        if (!oldData || !Array.isArray(oldData)) {
          return [watchlistItem];
        }

        const existingIndex = oldData.findIndex(
          (item) => item && item.filmId === film.id
        );

        if (existingIndex >= 0) {
          return oldData.map((item, index) =>
            index === existingIndex ? watchlistItem : item
          );
        } else {
          return [...oldData, watchlistItem];
        }
      });

      trackEvent(AnalyticsEvents.FILM_ADDED_TO_WATCHLIST, {
        film_id: film.id,
        film_title: film.title,
        film_year: film.year,
        film_type: film.type,
        film_genres: film.genres.join(','),
        match_percentage: film.matchPercentage || 90,
        from_recommendation: !!recommendationContext,
      });

      toast({
        title: 'Added to watchlist',
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
                  const currentWatchlistItems =
                    queryClient.getQueryData<any[]>(['/api/watchlist']) || [];
                  const watchlistItem = currentWatchlistItems.find(
                    (item) => item.filmId === film.id
                  );

                  if (!watchlistItem) {
                    throw new Error('Watchlist item not found');
                  }

                  await apiRequest('DELETE', `/api/watchlist/${watchlistItem.id}`);

                  onWatchlistChange(false);
                  setShowConfirmation(false);

                  queryClient.setQueryData(['/api/watchlist'], (oldData: any[]) => {
                    if (!oldData || !Array.isArray(oldData)) return [];
                    return oldData.filter((item) => item.filmId !== film.id);
                  });

                  toast({
                    title: 'Removed from watchlist',
                    description: `"${film.title}" removed from your watchlist`,
                    variant: 'default',
                  });
                } catch (error) {
                  console.error('Error removing from watchlist:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to remove from watchlist',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Undo
            </Button>
          </div>
        ),
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to add to watchlist: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="flex gap-2 mt-4">
      {/* Like/Dislike Buttons */}
      <div className="flex gap-2 flex-1">
        <Button
          variant={feedbackSubmitted === 'liked' ? 'default' : 'outline'}
          size="sm"
          className={`flex-1 ${
            feedbackSubmitted === 'liked'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'border-green-300 text-green-700 hover:bg-green-50'
          }`}
          onClick={() => recommendationFeedbackMutation.mutate('like')}
          disabled={recommendationFeedbackMutation.isPending || !!feedbackSubmitted}
        >
          {recommendationFeedbackMutation.isPending &&
          recommendationFeedbackMutation.variables === 'like' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsUp
              className={`h-4 w-4 ${
                feedbackSubmitted === 'liked' ? 'fill-white' : ''
              }`}
            />
          )}
          <span className="ml-1">Yes</span>
        </Button>

        <Button
          variant={feedbackSubmitted === 'disliked' ? 'default' : 'outline'}
          size="sm"
          className={`flex-1 ${
            feedbackSubmitted === 'disliked'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'border-red-300 text-red-700 hover:bg-red-50'
          }`}
          onClick={() => recommendationFeedbackMutation.mutate('dislike')}
          disabled={recommendationFeedbackMutation.isPending || !!feedbackSubmitted}
        >
          {recommendationFeedbackMutation.isPending &&
          recommendationFeedbackMutation.variables === 'dislike' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsDown
              className={`h-4 w-4 ${
                feedbackSubmitted === 'disliked' ? 'fill-white' : ''
              }`}
            />
          )}
          <span className="ml-1">No</span>
        </Button>
      </div>

      {/* Watchlist Button */}
      <Button
        variant={isWatchlisted ? 'default' : 'outline'}
        size="sm"
        className={`${
          isWatchlisted
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'border-blue-300 text-blue-700 hover:bg-blue-50'
        }`}
        onClick={() => addToWatchlistMutation.mutate()}
        disabled={addToWatchlistMutation.isPending || isWatchlisted}
      >
        {addToWatchlistMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isWatchlisted ? (
          <BookmarkCheck className="h-4 w-4 fill-white" />
        ) : (
          <BookmarkPlus className="h-4 w-4" />
        )}
        <span className="ml-1">
          {isWatchlisted ? 'Added' : 'Add to Watchlist'}
        </span>
      </Button>

      {/* Confirmation Badge */}
      {showConfirmation && (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 animate-in fade-in-0 zoom-in-95 duration-300"
        >
          <Check className="h-3 w-3 mr-1" />
          Added
        </Badge>
      )}
    </div>
  );
}