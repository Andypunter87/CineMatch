import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useErrorToast } from "@/lib/error-utils";
import { useFirestoreCollections } from "./use-firestore-collections";
import { RecommendationRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogCategory } from "@/lib/firestore-test-logger";

/**
 * Interface for film feedback
 */
export interface FilmFeedback {
  filmId: number;
  filmTitle: string;
  liked: boolean;
  timestamp?: string;
  moodContext?: string;
  runtimePreference?: string[];
  recommendationContext?: RecommendationRequest;
}

/**
 * Hook for managing film feedback with persistence to both API and Firestore
 */
export function useFilmFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const firestore = useFirestoreCollections();

  // Submit feedback mutation (both to API and Firestore)
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: FilmFeedback) => {
      try {
        console.log(`🎬 Client: User clicked ${feedback.liked ? 'LIKE' : 'DISLIKE'} for "${feedback.filmTitle}" (ID: ${feedback.filmId})`);
        console.log(`👤 Client: User ID: ${user?.id}, Authenticated: ${!!user}`);
        
        // Save to API
        console.log(`📤 Client: Sending feedback to API endpoint /api/feedback`);
        const apiResponse = await apiRequest("POST", "/api/feedback", {
          filmId: feedback.filmId,
          filmTitle: feedback.filmTitle,
          feedback: feedback.liked ? 'like' : 'dislike',
          recommendationContext: feedback.recommendationContext
        });
        
        console.log(`✅ Client: API response received:`, await apiResponse.json());
        
        // Now save to Firestore if we have a user
        if (user) {
          console.log(`💾 Client: Also saving to Firestore for user ${user.id}`);
          const timestamp = new Date().toISOString();
          
          // Save to Firestore using the film ID as the document ID for easier retrieval
          await firestore.saveFilmFeedback(
            user.id,
            feedback.filmId,
            {
              filmId: feedback.filmId,
              title: feedback.filmTitle,
              liked: feedback.liked,
              timestamp,
              moodContext: feedback.moodContext || null,
              runtimePreference: feedback.runtimePreference || null,
              recommendationContext: feedback.recommendationContext || null
            },
            {
              logCategory: LogCategory.FEEDBACK,
              additionalInfo: { userId: user.id }
            }
          );
        }
        
        const apiResult = await apiResponse.json();
        return apiResult;
      } catch (error) {
        showErrorToast(error as Error, "Failed to save feedback");
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Don't invalidate any queries as it could disrupt the user experience
      // Toast notifications are handled by the calling component
    },
    onError: (error) => {
      showErrorToast(error, "Failed to save feedback");
    }
  });

  // Get feedback for a specific film
  const getFilmFeedback = async (filmId: number): Promise<FilmFeedback | null> => {
    if (!user) return null;
    
    try {
      return await firestore.getFilmFeedback(user.id, filmId);
    } catch (error) {
      console.error("Error loading film feedback:", error);
      return null;
    }
  };

  // Check if a film has feedback
  const hasFilmFeedback = async (filmId: number): Promise<boolean> => {
    const feedback = await getFilmFeedback(filmId);
    return !!feedback;
  };

  return {
    submitFeedbackMutation,
    getFilmFeedback,
    hasFilmFeedback
  };
}