import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { Film } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export type OnboardingState = {
  completed: boolean;
  currentStep: "intro" | "preferences" | "ratings" | "completed";
  progress: number;
  lastUpdated: string;
};

export type FilmRating = {
  filmId: number;
  filmTitle: string;
  filmPosterUrl: string;
  rating: number | null; // 1-5 stars, null means "haven't seen"
  status?: string; // "not_seen", "seen", "liked", "loved", etc.
};

export function useOnboarding() {
  const { toast } = useToast();

  // Get the user's current onboarding state
  const { data: onboardingState, isLoading: isLoadingState, refetch: refetchState } = useQuery<{ onboardingState: OnboardingState }>({
    queryKey: ['/api/onboarding/state'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Update onboarding state
  const updateStateMutation = useMutation({
    mutationFn: async (state: Partial<OnboardingState>) => {
      const res = await apiRequest('PUT', '/api/onboarding/state', state);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update onboarding state",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save user preferences (country and streaming services)
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: { country: string; streamingServices: string[] }) => {
      const res = await apiRequest('POST', '/api/onboarding/preferences', preferences);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get films for onboarding
  const getFilmsQuery = (count = 12, offset = 0, batchNumber = 1) => {
    return useQuery<{ films: Film[] }>({
      queryKey: ['/api/onboarding/films', count, offset, batchNumber],
      queryFn: getQueryFn({ on401: "returnNull" }),
      retry: false,
    });
  };

  // Rate a single film
  const rateFilmMutation = useMutation({
    mutationFn: async (rating: FilmRating) => {
      const res = await apiRequest('POST', '/api/onboarding/rate', rating);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/ratings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rate multiple films at once
  const rateBatchMutation = useMutation({
    mutationFn: async ({ ratings, batchNumber = 1 }: { ratings: FilmRating[]; batchNumber?: number }) => {
      const res = await apiRequest('POST', '/api/onboarding/rate-batch', { ratings, batchNumber });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      
      // Show success toast with progress
      toast({
        title: "Ratings saved",
        description: `Progress: ${data.progress}%`,
      });
      
      // If onboarding is complete, also invalidate user recommendations
      if (data.complete) {
        queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save ratings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get all user's onboarding ratings
  const { data: ratingsData, isLoading: isLoadingRatings } = useQuery<{ ratings: any[] }>({
    queryKey: ['/api/onboarding/ratings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Complete onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/onboarding/complete');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Onboarding completed",
        description: "Your profile is ready. Enjoy personalized recommendations!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete onboarding",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // State
    onboardingState: onboardingState?.onboardingState,
    isLoadingState,
    refetchState,
    
    // Mutations
    updateState: updateStateMutation.mutate,
    savePreferences: savePreferencesMutation.mutate,
    rateFilm: rateFilmMutation.mutate,
    rateBatch: rateBatchMutation.mutate,
    completeOnboarding: completeOnboardingMutation.mutate,
    
    // Film queries
    getFilmsQuery,
    
    // Ratings
    ratings: ratingsData?.ratings || [],
    isLoadingRatings,
    
    // Mutation states
    isUpdatingState: updateStateMutation.isPending,
    isSavingPreferences: savePreferencesMutation.isPending,
    isRatingFilm: rateFilmMutation.isPending,
    isRatingBatch: rateBatchMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  };
}