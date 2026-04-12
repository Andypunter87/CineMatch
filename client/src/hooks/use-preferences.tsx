/**
 * User preferences hook — backed by REST API (PostgreSQL).
 * Firebase/Firestore has been removed.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserPreferences } from "@/lib/types/preferences";

export function usePreferences(isOnboarding = false) {
  const { toast } = useToast();
  const { user } = useAuth();

  const apiEndpoint = isOnboarding
    ? '/api/onboarding/preferences'
    : '/api/preferences';

  const {
    data: apiPreferences,
    isLoading: isLoadingApi,
    refetch: refetchPreferences,
  } = useQuery<{ preferences: UserPreferences }>({
    queryKey: [apiEndpoint],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: !!user,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      const method = isOnboarding ? 'POST' : 'PUT';
      const res = await apiRequest(method, apiEndpoint, preferences);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      if (!isOnboarding) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      toast({
        title: "Preferences updated",
        description: "Your streaming services and country preferences have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save preferences",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const updateStreamingServicesMutation = useMutation({
    mutationFn: async (streamingServices: string[]) => {
      const res = await apiRequest('PUT', '/api/user/streaming', { streamingServices });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
    },
  });

  const updateCountryMutation = useMutation({
    mutationFn: async (country: string) => {
      const res = await apiRequest('PUT', '/api/user/country', { country });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
    },
  });

  return {
    preferences: apiPreferences?.preferences || { country: "", streamingServices: [] },
    isLoading: isLoadingApi,

    savePreferences: savePreferencesMutation.mutate,
    updateStreamingServices: updateStreamingServicesMutation.mutate,
    updateCountry: updateCountryMutation.mutate,

    isSaving: savePreferencesMutation.isPending,
    isUpdatingStreamingServices: updateStreamingServicesMutation.isPending,
    isUpdatingCountry: updateCountryMutation.isPending,

    syncPreferences: async () => true,
  };
}
