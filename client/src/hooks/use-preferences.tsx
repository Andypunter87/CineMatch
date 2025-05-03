import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { UserPreferences } from "@/lib/types/preferences";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { useEffect, useState } from "react";

/**
 * A hook for managing user preferences (country and streaming services)
 * Persists data to both the server API and Firestore
 */
export function usePreferences(isOnboarding = false) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(false);

  // API endpoints based on whether this is used in onboarding or profile
  const apiEndpoint = isOnboarding 
    ? '/api/onboarding/preferences' 
    : '/api/user/preferences';

  // Load user preferences from API
  const { 
    data: apiPreferences, 
    isLoading: isLoadingApi, 
    refetch: refetchPreferences 
  } = useQuery<{ preferences: UserPreferences }>({
    queryKey: [apiEndpoint],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: !!user, // Only run if user is authenticated
  });

  // Helper function to get Firestore doc reference for preferences
  const getPreferencesDocRef = () => {
    if (!user) return null;
    return doc(db, 'user_preferences', `user-${user.id}`);
  };

  // Load preferences from Firestore on mount
  useEffect(() => {
    if (!user) return;
    
    const loadFromFirestore = async () => {
      try {
        setIsLoadingFirestore(true);
        const docRef = getPreferencesDocRef();
        if (!docRef) return;
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const firestorePrefs = docSnap.data() as UserPreferences;
          setLocalPreferences(firestorePrefs);
          console.log("Loaded preferences from Firestore:", firestorePrefs);
        } else {
          console.log("No preferences found in Firestore");
        }
      } catch (error) {
        console.error("Error loading preferences from Firestore:", error);
      } finally {
        setIsLoadingFirestore(false);
      }
    };
    
    loadFromFirestore();
  }, [user?.id]);

  // Save preferences to Firestore
  const saveToFirestore = async (preferences: UserPreferences) => {
    if (!user) return;
    
    try {
      const docRef = getPreferencesDocRef();
      if (!docRef) return;
      
      // Add timestamp to preferences
      const prefWithTimestamp = {
        ...preferences,
        userId: user.id,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(docRef, prefWithTimestamp);
      console.log("Preferences saved to Firestore:", preferences);
      
      // Update local copy
      setLocalPreferences(preferences);
      
      return true;
    } catch (error) {
      console.error("Error saving preferences to Firestore:", error);
      return false;
    }
  };

  // Save preferences mutation - persists to both API and Firestore
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      // First save to API
      const res = await apiRequest('POST', apiEndpoint, preferences);
      const apiResponse = await res.json();
      
      // Then save to Firestore
      await saveToFirestore(preferences);
      
      return apiResponse;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      
      // If updating via profile, also update user data
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
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update streaming services only (convenience method)
  const updateStreamingServicesMutation = useMutation({
    mutationFn: async (streamingServices: string[]) => {
      // Get current country if we have it, or default to empty string
      const country = (apiPreferences?.preferences?.country || localPreferences?.country || "");
      
      // Combine into full preferences
      const preferences: UserPreferences = {
        streamingServices,
        country,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to both API and Firestore
      const res = await apiRequest('PUT', '/api/user/streaming', { streamingServices });
      const apiResponse = await res.json();
      
      await saveToFirestore(preferences);
      
      return apiResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      
      toast({
        title: "Streaming services updated",
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
      // Get current streaming services if we have them, or default to empty array
      const streamingServices = (
        apiPreferences?.preferences?.streamingServices || 
        localPreferences?.streamingServices || 
        []
      );
      
      // Combine into full preferences
      const preferences: UserPreferences = {
        streamingServices,
        country,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to both API and Firestore
      const res = await apiRequest('PUT', '/api/user/country', { country });
      const apiResponse = await res.json();
      
      await saveToFirestore(preferences);
      
      return apiResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      
      toast({
        title: "Country updated",
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

  // Sync data between API and Firestore if needed (useful for offline recovery)
  const syncPreferences = async () => {
    if (!user) return false;
    
    try {
      // Get preferences from both sources
      const apiPrefs = apiPreferences?.preferences;
      // If we don't have API preferences yet, trigger a fetch
      if (!apiPrefs) {
        await refetchPreferences();
      }
      
      // Compare and decide what to sync
      if (localPreferences && 
          isNewer(localPreferences.lastUpdated, apiPrefs?.lastUpdated)) {
        // Local Firestore data is newer, push to API
        await savePreferencesMutation.mutateAsync(localPreferences);
        console.log("Synced preferences from Firestore to API");
      } else if (apiPrefs && 
                isNewer(apiPrefs.lastUpdated, localPreferences?.lastUpdated)) {
        // API data is newer, save to Firestore
        await saveToFirestore(apiPrefs);
        console.log("Synced preferences from API to Firestore");
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing preferences:", error);
      return false;
    }
  };

  return {
    // Data
    preferences: apiPreferences?.preferences || localPreferences || { country: "", streamingServices: [] },
    isLoading: isLoadingApi || isLoadingFirestore,
    
    // Mutations
    savePreferences: savePreferencesMutation.mutate,
    updateStreamingServices: updateStreamingServicesMutation.mutate,
    updateCountry: updateCountryMutation.mutate,
    
    // Mutation states
    isSaving: savePreferencesMutation.isPending,
    isUpdatingStreamingServices: updateStreamingServicesMutation.isPending,
    isUpdatingCountry: updateCountryMutation.isPending,
    
    // Firestore specific
    syncPreferences,
    saveToFirestore,
  };
}