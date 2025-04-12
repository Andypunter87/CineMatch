import { useQuery } from "@tanstack/react-query";
import { UserRecommendations, Film, RecommendationRequest } from "@shared/schema";
import { useAuth } from "./use-auth";
import { getQueryFn } from "@/lib/queryClient";

export function useRecommendationHistory() {
  const { user } = useAuth();
  
  const {
    data: history,
    isLoading,
    error,
    refetch,
  } = useQuery<UserRecommendations>({
    queryKey: ["/api/recommendations/history"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // Only run query if user is logged in
  });

  // Function to transform the history data to what the UI expects
  const transformHistoryToRecommendations = (): {
    recommendations: Film[] | null;
    preferences: RecommendationRequest | null;
  } => {
    if (!history) {
      return { recommendations: null, preferences: null };
    }
    
    return {
      recommendations: history.recommendations,
      preferences: history.preferences
    };
  };

  return {
    historyData: history,
    recommendations: transformHistoryToRecommendations().recommendations,
    preferences: transformHistoryToRecommendations().preferences,
    isLoading,
    error,
    refetch,
    hasHistory: !!history
  };
}