import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilmRating } from "@/hooks/use-film-rating";
import { FilmRating } from "@/lib/types/film-rating";

export type OnboardingState = {
  completed: boolean;
  currentStep: "intro" | "preferences" | "ratings" | "completed";
  progress: number;
  lastUpdated: string;
};

export function useOnboarding() {
  const { toast } = useToast();
  
  // Use the film rating hook with onboarding mode enabled
  const filmRating = useFilmRating(true);

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
    completeOnboarding: completeOnboardingMutation.mutate,
    
    // Film rating functionality (delegated to useFilmRating hook)
    rateFilm: filmRating.rateFilm,
    rateBatch: filmRating.rateBatch,
    getFilmsQuery: filmRating.getFilmsQuery,
    ratings: filmRating.ratings,
    isLoadingRatings: filmRating.isLoadingRatings,
    isRatingFilm: filmRating.isRatingFilm,
    isRatingBatch: filmRating.isRatingBatch,
    
    // Mutation states
    isUpdatingState: updateStateMutation.isPending,
    isSavingPreferences: savePreferencesMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  };
}