import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export interface UserPreferences {
  country: string;
  streamingServices: string[];
  lastUpdated?: string;
}

export interface OnboardingStatus {
  step?: string | number;
  progress?: number;
  completed?: boolean;
  updatedAt?: string;
}

export function useUserPreferences(isOnboarding = false) {
  const { toast } = useToast();
  const { user } = useAuth();

  const apiPreferencesEndpoint = isOnboarding
    ? '/api/onboarding/preferences'
    : '/api/user/preferences';

  const apiStreamingEndpoint = '/api/user/streaming';
  const apiCountryEndpoint = '/api/user/country';
  const apiOnboardingStatusEndpoint = '/api/onboarding/status';

  const {
    data: preferencesData,
    isLoading: isLoadingPreferences,
    refetch: refetchPreferences,
    error: preferencesError,
  } = useQuery<{ preferences: UserPreferences }>({
    queryKey: [apiPreferencesEndpoint],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    enabled: !!user,
  });

  const {
    data: onboardingStatusData,
    isLoading: isLoadingOnboardingStatus,
    refetch: refetchOnboardingStatus,
  } = useQuery<{ status: OnboardingStatus }>({
    queryKey: [apiOnboardingStatusEndpoint],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    enabled: !!user && isOnboarding,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      const res = await apiRequest('POST', apiPreferencesEndpoint, preferences);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPreferencesEndpoint] });
      if (!isOnboarding) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      toast({
        title: "Preferences Updated",
        description: "Your streaming services and country preferences have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStreamingServicesMutation = useMutation({
    mutationFn: async (streamingServices: string[]) => {
      const res = await apiRequest('PUT', apiStreamingEndpoint, { streamingServices });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [apiPreferencesEndpoint] });
      toast({
        title: "Streaming Services Updated",
        description: "Your streaming service preferences have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update streaming services",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCountryMutation = useMutation({
    mutationFn: async (country: string) => {
      const res = await apiRequest('PUT', apiCountryEndpoint, { country });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [apiPreferencesEndpoint] });
      toast({
        title: "Country Updated",
        description: "Your country preference has been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update country",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOnboardingStatusMutation = useMutation({
    mutationFn: async (status: OnboardingStatus) => {
      const res = await apiRequest('POST', apiOnboardingStatusEndpoint, status);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiOnboardingStatusEndpoint] });
    },
    onError: (error: Error) => {
      if (!isOnboarding) {
        toast({
          title: "Failed to update onboarding status",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  return {
    preferences: preferencesData?.preferences || { country: "", streamingServices: [] },
    onboardingStatus: onboardingStatusData?.status || { step: 0, progress: 0, completed: false },
    isLoadingPreferences,
    isLoadingOnboardingStatus,
    refetchPreferences,
    refetchOnboardingStatus,
    preferencesError,
    isOffline: false,

    savePreferences: savePreferencesMutation.mutate,
    updateStreamingServices: updateStreamingServicesMutation.mutate,
    updateCountry: updateCountryMutation.mutate,
    updateOnboardingStatus: updateOnboardingStatusMutation.mutate,

    isSaving: savePreferencesMutation.isPending,
    isUpdatingStreamingServices: updateStreamingServicesMutation.isPending,
    isUpdatingCountry: updateCountryMutation.isPending,
    isUpdatingOnboardingStatus: updateOnboardingStatusMutation.isPending,

    // No-op stubs for backward compatibility
    syncPreferences: async () => true,
    syncOnboardingStatus: async () => true,
    savePreferencesToFirestore: async () => false,
    loadPreferencesFromFirestore: async () => null,
    firestore: null,
  };
}
