import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFilmRating } from "@/hooks/use-film-rating";
import { usePreferences } from "@/hooks/use-preferences";
import { FilmRating } from "@/lib/types/film-rating";
import { UserPreferences } from "@/lib/types/preferences";

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
  
  // Use the preferences hook with onboarding mode enabled
  const preferences = usePreferences(true);

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
    completeOnboarding: completeOnboardingMutation.mutate,
    
    // Film rating functionality (delegated to useFilmRating hook)
    rateFilm: filmRating.rateFilm,
    rateBatch: filmRating.rateBatch,
    getFilmsQuery: filmRating.getFilmsQuery,
    ratings: filmRating.ratings,
    isLoadingRatings: filmRating.isLoadingRatings,
    isRatingFilm: filmRating.isRatingFilm,
    isRatingBatch: filmRating.isRatingBatch,
    
    // Preferences functionality (delegated to usePreferences hook)
    userPreferences: preferences.preferences,
    isLoadingPreferences: preferences.isLoading,
    savePreferences: preferences.savePreferences,
    isSavingPreferences: preferences.isSaving,
    
    // Mutation states
    isUpdatingState: updateStateMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  };
}