import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollections } from "./use-firestore-collections";
import { useErrorToast } from "@/lib/error-utils";
import { useState } from "react";
import { LogCategory } from "@/lib/firestore-test-logger";

// Types for user preferences
export interface UserPreferences {
  country: string;
  streamingServices: string[];
  lastUpdated?: string;
}

// Types for onboarding status
export interface OnboardingStatus {
  step?: string | number;
  progress?: number;
  completed?: boolean;
  updatedAt?: string;
}

/**
 * Hook for managing user preferences using the unified Firestore schema
 * Persists data to both the server API and Firestore
 */
export function useUserPreferences(isOnboarding = false) {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);

  // Use the firestore collections hook
  const firestore = useFirestoreCollections();

  // API endpoints
  const apiPreferencesEndpoint = isOnboarding 
    ? '/api/onboarding/preferences' 
    : '/api/user/preferences';
  
  const apiStreamingEndpoint = '/api/user/streaming';
  const apiCountryEndpoint = '/api/user/country';
  const apiOnboardingStatusEndpoint = '/api/onboarding/status';

  // Load user preferences from API
  const { 
    data: preferencesData, 
    isLoading: isLoadingPreferences, 
    refetch: refetchPreferences,
    error: preferencesError 
  } = useQuery<{ preferences: UserPreferences }>({
    queryKey: [apiPreferencesEndpoint],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        // If there's a network error, try to load from Firestore as fallback
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setIsOffline(true);
          loadPreferencesFromFirestore().then(preferences => {
            if (preferences) {
              setLocalPreferences(preferences);
              queryClient.setQueryData([apiPreferencesEndpoint], { preferences });
            }
          });
        }
        showErrorToast(error, "Failed to Load Preferences");
      }
    }),
    retry: 1,
    enabled: !!user
  });

  // Load onboarding status (only used in onboarding mode)
  const { 
    data: onboardingStatusData, 
    isLoading: isLoadingOnboardingStatus, 
    refetch: refetchOnboardingStatus
  } = useQuery<{ status: OnboardingStatus }>({
    queryKey: [apiOnboardingStatusEndpoint],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Onboarding Status");
      }
    }),
    retry: 1,
    enabled: !!user && isOnboarding
  });

  // Save preferences to Firestore
  const savePreferencesToFirestore = async (preferences: UserPreferences): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const success = await firestore.updateUserPreferences(
        user.id,
        {
          country: preferences.country,
          streamingServices: preferences.streamingServices
        }
      );
      
      if (success) {
        setLocalPreferences(preferences);
        console.log(`Preferences saved to Firestore: ${JSON.stringify(preferences)}`);
      }
      
      return success;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Save Preferences to Firestore");
      return false;
    }
  };

  // Update onboarding status in Firestore
  const saveOnboardingStatusToFirestore = async (status: OnboardingStatus): Promise<boolean> => {
    if (!user) return false;
    
    try {
      return await firestore.updateOnboardingStatus(
        user.id,
        status
      );
    } catch (error) {
      showErrorToast(error as Error, "Failed to Save Onboarding Status to Firestore");
      return false;
    }
  };

  // Load preferences from Firestore for fallback/offline capabilities
  const loadPreferencesFromFirestore = async (): Promise<UserPreferences | null> => {
    if (!user) return null;
    
    try {
      const userData = await firestore.getUserData(user.id);
      
      if (userData && userData.preferences) {
        const preferences: UserPreferences = {
          country: userData.preferences.country || '',
          streamingServices: userData.preferences.streamingServices || [],
          lastUpdated: userData.preferences.updatedAt
        };
        
        console.log(`Loaded preferences from Firestore: ${JSON.stringify(preferences)}`);
        return preferences;
      }
      
      return null;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Load Preferences from Firestore");
      return null;
    }
  };

  // Load onboarding status from Firestore
  const loadOnboardingStatusFromFirestore = async (): Promise<OnboardingStatus | null> => {
    if (!user) return null;
    
    try {
      const userData = await firestore.getUserData(user.id);
      
      if (userData && userData.onboardingStatus) {
        return userData.onboardingStatus as OnboardingStatus;
      }
      
      return null;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Load Onboarding Status from Firestore");
      return null;
    }
  };

  // Save user preferences mutation - persists to both API and Firestore
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          const success = await savePreferencesToFirestore(preferences);
          
          if (success) {
            return { success: true, message: "Preferences saved offline" };
          } else {
            throw new Error("Failed to save preferences offline");
          }
        }
        
        // Call API
        const res = await apiRequest('POST', apiPreferencesEndpoint, preferences);
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        await savePreferencesToFirestore(preferences);
        
        return apiResponse;
      } catch (error) {
        console.error("Error saving preferences:", error);
        showErrorToast(error as Error, "Failed to Save Preferences");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          const success = await savePreferencesToFirestore(preferences);
          
          if (success) {
            toast({
              title: "Saved Offline",
              description: "Preferences saved locally and will sync when you're back online",
            });
            return { success: true, offline: true };
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPreferencesEndpoint] });
      
      // If updating via profile, also update user data
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

  // Update streaming services only (convenience method)
  const updateStreamingServicesMutation = useMutation({
    mutationFn: async (streamingServices: string[]) => {
      try {
        // Get current country if we have it, or default to empty string
        const country = (preferencesData?.preferences?.country || localPreferences?.country || "");
        
        // Combine into full preferences
        const preferences: UserPreferences = {
          streamingServices,
          country,
          lastUpdated: new Date().toISOString()
        };
        
        // If offline, only save to Firestore
        if (isOffline) {
          const success = await savePreferencesToFirestore(preferences);
          
          if (success) {
            return { success: true, message: "Streaming services saved offline" };
          } else {
            throw new Error("Failed to save streaming services offline");
          }
        }
        
        // Call API
        const res = await apiRequest('PUT', apiStreamingEndpoint, { streamingServices });
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        await savePreferencesToFirestore(preferences);
        
        return apiResponse;
      } catch (error) {
        console.error("Error updating streaming services:", error);
        showErrorToast(error as Error, "Failed to Update Streaming Services");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          
          // Get current country if we have it, or default to empty string
          const country = (preferencesData?.preferences?.country || localPreferences?.country || "");
          
          // Combine into full preferences
          const preferences: UserPreferences = {
            streamingServices,
            country,
            lastUpdated: new Date().toISOString()
          };
          
          const success = await savePreferencesToFirestore(preferences);
          
          if (success) {
            toast({
              title: "Saved Offline",
              description: "Streaming services saved locally and will sync when you're back online",
            });
            return { success: true, offline: true };
          }
        }
        
        throw error;
      }
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

  // Update country only (convenience method)
  const updateCountryMutation = useMutation({
    mutationFn: async (country: string) => {
      try {
        // Get current streaming services if we have them, or default to empty array
        const streamingServices = (
          preferencesData?.preferences?.streamingServices || 
          localPreferences?.streamingServices || 
          []
        );
        
        // Combine into full preferences
        const preferences: UserPreferences = {
          streamingServices,
          country,
          lastUpdated: new Date().toISOString()
        };
        
        // If offline, only save to Firestore
        if (isOffline) {
          const success = await savePreferencesToFirestore(preferences);
          
          if (success) {
            return { success: true, message: "Country saved offline" };
          } else {
            throw new Error("Failed to save country offline");
          }
        }
        
        // Call API
        const res = await apiRequest('PUT', apiCountryEndpoint, { country });
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        await savePreferencesToFirestore(preferences);
        
        return apiResponse;
      } catch (error) {
        console.error("Error updating country:", error);
        showErrorToast(error as Error, "Failed to Update Country");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          
          // Get current streaming services if we have them, or default to empty array
          const streamingServices = (
            preferencesData?.preferences?.streamingServices || 
            localPreferences?.streamingServices || 
            []
          );
          
          // Combine into full preferences
          const preferences: UserPreferences = {
            streamingServices,
            country,
            lastUpdated: new Date().toISOString()
          };
          
          const success = await savePreferencesToFirestore(preferences);
          
          if (success) {
            toast({
              title: "Saved Offline",
              description: "Country preference saved locally and will sync when you're back online",
            });
            return { success: true, offline: true };
          }
        }
        
        throw error;
      }
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

  // Update onboarding status - persists to both API and Firestore
  const updateOnboardingStatusMutation = useMutation({
    mutationFn: async (status: OnboardingStatus) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          const success = await saveOnboardingStatusToFirestore(status);
          
          if (success) {
            return { success: true, message: "Onboarding status saved offline" };
          } else {
            throw new Error("Failed to save onboarding status offline");
          }
        }
        
        // Call API
        const res = await apiRequest('POST', apiOnboardingStatusEndpoint, status);
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        await saveOnboardingStatusToFirestore(status);
        
        return apiResponse;
      } catch (error) {
        console.error("Error updating onboarding status:", error);
        showErrorToast(error as Error, "Failed to Update Onboarding Status");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          const success = await saveOnboardingStatusToFirestore(status);
          
          if (success) {
            toast({
              title: "Saved Offline",
              description: "Onboarding status saved locally and will sync when you're back online",
            });
            return { success: true, offline: true };
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiOnboardingStatusEndpoint] });
      
      // Don't show a toast for this, it's a background update
    },
    onError: (error: Error) => {
      // Only show a toast if we're not in onboarding mode
      if (!isOnboarding) {
        toast({
          title: "Failed to update onboarding status",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Helper function to safely get a date from a possibly undefined string or Date
  const safeDate = (dateValue?: string | Date): Date | null => {
    if (!dateValue) return null;
    try {
      return new Date(dateValue);
    } catch (e) {
      return null;
    }
  };
  
  // Helper to safely compare dates, returning true if a is later than b
  const isNewer = (a?: string | Date, b?: string | Date): boolean => {
    const dateA = safeDate(a);
    const dateB = safeDate(b);
    
    if (!dateA) return false;
    if (!dateB) return true;
    
    return dateA.getTime() > dateB.getTime();
  };

  // Sync preferences between API and Firestore (for offline recovery)
  const syncPreferences = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get preferences from both sources
      const apiPrefs = preferencesData?.preferences;
      const firestorePrefs = await loadPreferencesFromFirestore();
      
      // If we have both, compare them and sync the newer one
      if (apiPrefs && firestorePrefs) {
        if (isNewer(firestorePrefs.lastUpdated, apiPrefs.lastUpdated)) {
          // Firestore data is newer, push to API
          await savePreferencesMutation.mutateAsync(firestorePrefs);
          console.log("Synced preferences from Firestore to API");
          return true;
        } else if (isNewer(apiPrefs.lastUpdated, firestorePrefs.lastUpdated)) {
          // API data is newer, save to Firestore
          await savePreferencesToFirestore(apiPrefs);
          console.log("Synced preferences from API to Firestore");
          return true;
        }
        return true; // No sync needed
      } 
      // If we only have API preferences, save to Firestore
      else if (apiPrefs) {
        await savePreferencesToFirestore(apiPrefs);
        return true;
      } 
      // If we only have Firestore preferences, push to API
      else if (firestorePrefs) {
        await savePreferencesMutation.mutateAsync(firestorePrefs);
        return true;
      }
      
      return false; // Nothing to sync
    } catch (error) {
      console.error("Error syncing preferences:", error);
      showErrorToast(error as Error, "Failed to Sync Preferences");
      return false;
    }
  };

  // Sync onboarding status between API and Firestore
  const syncOnboardingStatus = async (): Promise<boolean> => {
    if (!user || !isOnboarding) return false;
    
    try {
      // Get onboarding status from both sources
      const apiStatus = onboardingStatusData?.status;
      const firestoreStatus = await loadOnboardingStatusFromFirestore();
      
      // If we have both, compare them and sync the newer one
      if (apiStatus && firestoreStatus) {
        if (isNewer(firestoreStatus.updatedAt, apiStatus.updatedAt)) {
          // Firestore data is newer, push to API
          await updateOnboardingStatusMutation.mutateAsync(firestoreStatus);
          console.log("Synced onboarding status from Firestore to API");
          return true;
        } else if (isNewer(apiStatus.updatedAt, firestoreStatus.updatedAt)) {
          // API data is newer, save to Firestore
          await saveOnboardingStatusToFirestore(apiStatus);
          console.log("Synced onboarding status from API to Firestore");
          return true;
        }
        return true; // No sync needed
      } 
      // If we only have API status, save to Firestore
      else if (apiStatus) {
        await saveOnboardingStatusToFirestore(apiStatus);
        return true;
      } 
      // If we only have Firestore status, push to API
      else if (firestoreStatus) {
        await updateOnboardingStatusMutation.mutateAsync(firestoreStatus);
        return true;
      }
      
      return false; // Nothing to sync
    } catch (error) {
      console.error("Error syncing onboarding status:", error);
      showErrorToast(error as Error, "Failed to Sync Onboarding Status");
      return false;
    }
  };

  return {
    // Data
    preferences: preferencesData?.preferences || localPreferences || { country: "", streamingServices: [] },
    onboardingStatus: onboardingStatusData?.status || { step: 0, progress: 0, completed: false },
    isLoadingPreferences,
    isLoadingOnboardingStatus,
    refetchPreferences,
    refetchOnboardingStatus,
    preferencesError,
    isOffline,
    
    // Mutations
    savePreferences: savePreferencesMutation.mutate,
    updateStreamingServices: updateStreamingServicesMutation.mutate,
    updateCountry: updateCountryMutation.mutate,
    updateOnboardingStatus: updateOnboardingStatusMutation.mutate,
    
    // Mutation states
    isSaving: savePreferencesMutation.isPending,
    isUpdatingStreamingServices: updateStreamingServicesMutation.isPending,
    isUpdatingCountry: updateCountryMutation.isPending,
    isUpdatingOnboardingStatus: updateOnboardingStatusMutation.isPending,
    
    // Firestore specific
    syncPreferences,
    syncOnboardingStatus,
    savePreferencesToFirestore,
    loadPreferencesFromFirestore,
    
    // Firestore access
    firestore,
  };
}