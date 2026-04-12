import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useErrorToast } from "@/lib/error-utils";
import { apiRequest } from "@/lib/queryClient";
import { RecommendationRequest } from "@shared/schema";

export interface FilmFeedback {
  filmId: number;
  filmTitle: string;
  liked: boolean;
  timestamp?: string;
  moodContext?: string;
  runtimePreference?: string[];
  recommendationContext?: RecommendationRequest;
}

export function useFilmFeedback() {
  const { user } = useAuth();
  const { showErrorToast } = useErrorToast();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: FilmFeedback) => {
      const res = await apiRequest("POST", "/api/feedback", {
        filmId: feedback.filmId,
        filmTitle: feedback.filmTitle,
        feedback: feedback.liked ? 'like' : 'dislike',
        moodContext: feedback.moodContext,
        runtimePreference: feedback.runtimePreference,
        recommendationContext: feedback.recommendationContext,
      });
      return res.json();
    },
    onSuccess: () => {},
    onError: (error) => {
      showErrorToast(error, "Failed to save feedback");
    },
  });

  const getFilmFeedback = async (filmId: number): Promise<FilmFeedback | null> => {
    if (!user) return null;
    try {
      const res = await apiRequest('GET', `/api/feedback/${filmId}`);
      const data = await res.json();
      if (!data.feedback) return null;
      const f = data.feedback;
      return {
        filmId: f.filmId,
        filmTitle: f.filmTitle,
        liked: f.liked,
        timestamp: f.createdAt,
        moodContext: f.moodContext,
        runtimePreference: f.runtimePreference,
        recommendationContext: f.recommendationContext,
      };
    } catch (error) {
      console.error("Error loading film feedback:", error);
      return null;
    }
  };

  const hasFilmFeedback = async (filmId: number): Promise<boolean> => {
    const feedback = await getFilmFeedback(filmId);
    return !!feedback;
  };

  return {
    submitFeedbackMutation,
    getFilmFeedback,
    hasFilmFeedback,
  };
}
