import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { RecommendationRequest } from "@shared/schema";

export interface FilmFeedbackData {
  filmId: number;
  title: string;
  liked: boolean;
  timestamp: string;
  moodContext?: string | null;
  runtimePreference?: string[] | null;
  recommendationContext?: RecommendationRequest | null;
}

export function useFilmFeedbackFirestore() {
  const { user } = useAuth();
  const [error, setError] = useState<Error | null>(null);

  const saveFilmFeedback = async (
    _userId: string | number,
    filmId: number,
    feedbackData: FilmFeedbackData,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<boolean> => {
    if (!user) return false;
    try {
      const liked = feedbackData.liked;
      await apiRequest('POST', '/api/feedback', {
        filmId,
        filmTitle: feedbackData.title,
        feedback: liked ? 'like' : 'dislike',
        moodContext: feedbackData.moodContext,
        runtimePreference: feedbackData.runtimePreference,
        recommendationContext: feedbackData.recommendationContext,
      });
      return true;
    } catch (err) {
      console.error("Error saving film feedback:", err);
      setError(err as Error);
      return false;
    }
  };

  const getFilmFeedback = async (
    _userId: string | number,
    filmId: number,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<FilmFeedbackData | null> => {
    if (!user) return null;
    try {
      const res = await apiRequest('GET', `/api/feedback/${filmId}`);
      const data = await res.json();
      if (!data.feedback) return null;
      const f = data.feedback;
      return {
        filmId: f.filmId,
        title: f.filmTitle,
        liked: f.liked,
        timestamp: f.createdAt || new Date().toISOString(),
        moodContext: f.moodContext,
        runtimePreference: f.runtimePreference,
        recommendationContext: f.recommendationContext,
      };
    } catch (err) {
      console.error("Error getting film feedback:", err);
      setError(err as Error);
      return null;
    }
  };

  const getAllFilmFeedback = async (
    _userId: string | number,
    _options: { logCategory?: string; additionalInfo?: Record<string, any> } = {}
  ): Promise<FilmFeedbackData[]> => {
    if (!user) return [];
    try {
      const res = await apiRequest('GET', '/api/feedback');
      const data = await res.json();
      return (data.feedback || []).map((f: any) => ({
        filmId: f.filmId,
        title: f.filmTitle,
        liked: f.liked,
        timestamp: f.createdAt || new Date().toISOString(),
        moodContext: f.moodContext,
        runtimePreference: f.runtimePreference,
        recommendationContext: f.recommendationContext,
      }));
    } catch (err) {
      console.error("Error getting all film feedback:", err);
      setError(err as Error);
      return [];
    }
  };

  return {
    saveFilmFeedback,
    getFilmFeedback,
    getAllFilmFeedback,
    error,
  };
}
