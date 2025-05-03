import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { Film } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FilmRating } from "@/lib/types/film-rating";
import { useFirestoreCollections } from "./use-firestore-collections";
import { useErrorToast } from "@/lib/error-utils";
import { useState } from "react";
import { LogCategory } from "@/lib/firestore-test-logger";

/**
 * Enhanced hook for handling film ratings using the unified Firestore schema
 * Persists data to both the server API and Firestore subcollections
 */
export function useFilmRatings(isOnboarding = false) {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);

  // Use the new firestore collections hook
  const firestore = useFirestoreCollections();

  // API endpoint based on whether it's onboarding or regular ratings
  const apiEndpoint = isOnboarding ? '/api/onboarding/rate' : '/api/films/rate';
  const apiBatchEndpoint = isOnboarding ? '/api/onboarding/rate-batch' : '/api/films/rate-batch';
  const apiRatingsEndpoint = isOnboarding ? '/api/onboarding/ratings' : '/api/films/user-ratings';

  // Get films for the rating process 
  // In onboarding mode, we get films from the onboarding API
  // In regular mode, we could get films from recommendation or another source
  const getFilmsQuery = (count = 12, offset = 0, batchNumber = 1) => {
    const endpoint = isOnboarding ? '/api/onboarding/films' : '/api/films/popular';
    
    return useQuery<{ films: Film[] }>({
      queryKey: [endpoint, count, offset, batchNumber],
      queryFn: getQueryFn({ 
        on401: "returnNull",
        onError: (error) => {
          showErrorToast(error, "Failed to Load Films");
        }
      }),
      retry: 2,
      retryDelay: 1000,
    });
  };

  // Get all user's ratings with improved error handling
  const { 
    data: ratingsData, 
    isLoading: isLoadingRatings, 
    refetch: refetchRatings,
    error: ratingsError 
  } = useQuery<{ ratings: FilmRating[] }>({
    queryKey: [apiRatingsEndpoint],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        // If there's a network error, try to load from Firestore as fallback
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setIsOffline(true);
          loadRatingsFromFirestore().then(ratings => {
            queryClient.setQueryData([apiRatingsEndpoint], { ratings });
          });
        }
        showErrorToast(error, "Failed to Load Ratings");
      }
    }),
    retry: 1,
    enabled: !!user // Only fetch if user is available
  });

  // Save a rating to Firestore with unified schema
  const saveRatingToFirestore = async (rating: FilmRating): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Determine if this is an onboarding rating or a recommendation rating
      if (isOnboarding) {
        return await firestore.saveOnboardingRating(
          user.id,
          rating.filmId, 
          rating.rating,
          rating.title
        );
      } else {
        // For recommendation ratings, we save it as good/bad
        return await firestore.saveRecommendationRating(
          user.id,
          rating.filmId,
          rating.rating >= 3 ? 'good' : 'bad',
          rating.title
        );
      }
    } catch (error) {
      showErrorToast(error as Error, "Failed to Save Rating to Firestore");
      return false;
    }
  };

  // Save multiple ratings to Firestore in a batch with unified schema
  const saveBatchToFirestore = async (ratings: FilmRating[]): Promise<boolean> => {
    if (!user || !ratings.length) return false;
    
    try {
      // Process each rating - we'll save them one by one for now
      // In the future could implement batch operations in the FirestoreCollections hook
      let success = true;
      
      for (const rating of ratings) {
        const result = await saveRatingToFirestore(rating);
        if (!result) success = false;
      }
      
      return success;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Save Ratings to Firestore");
      return false;
    }
  };

  // Rate a single film - persists to both API and Firestore with improved error handling
  const rateFilmMutation = useMutation({
    mutationFn: async (rating: FilmRating) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          const success = await saveRatingToFirestore(rating);
          if (success) {
            return { success: true, message: "Rating saved offline" };
          } else {
            throw new Error("Failed to save rating offline");
          }
        }
        
        // Call the API first
        const res = await apiRequest('POST', apiEndpoint, rating);
        const apiResponse = await res.json();
        
        // If API call succeeds, save to Firestore as well
        await saveRatingToFirestore(rating);
        
        // Update the local cache
        const currentRatings = queryClient.getQueryData<{ ratings: FilmRating[] }>([apiRatingsEndpoint]);
        if (currentRatings) {
          const updatedRatings = [...currentRatings.ratings];
          const existingIndex = updatedRatings.findIndex(r => r.filmId === rating.filmId);
          
          if (existingIndex >= 0) {
            updatedRatings[existingIndex] = rating;
          } else {
            updatedRatings.push(rating);
          }
          
          queryClient.setQueryData([apiRatingsEndpoint], { ratings: updatedRatings });
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error rating film:", error);
        showErrorToast(error as Error, "Failed to Rate Film");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          const success = await saveRatingToFirestore(rating);
          if (success) {
            toast({
              title: "Saved Offline",
              description: "Your rating was saved locally and will sync when you're back online",
            });
            return { success: true, offline: true };
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiRatingsEndpoint] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rate multiple films at once - persists to both API and Firestore
  const rateBatchMutation = useMutation({
    mutationFn: async ({ ratings, batchNumber = 1 }: { ratings: FilmRating[]; batchNumber?: number }) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          const success = await saveBatchToFirestore(ratings);
          if (success) {
            // Update the local cache
            const currentRatings = queryClient.getQueryData<{ ratings: FilmRating[] }>([apiRatingsEndpoint]) || { ratings: [] };
            const updatedRatings = [...currentRatings.ratings];
            
            ratings.forEach(rating => {
              const existingIndex = updatedRatings.findIndex(r => r.filmId === rating.filmId);
              if (existingIndex >= 0) {
                updatedRatings[existingIndex] = rating;
              } else {
                updatedRatings.push(rating);
              }
            });
            
            queryClient.setQueryData([apiRatingsEndpoint], { ratings: updatedRatings });
            return { success: true, message: "Ratings saved offline", progress: 100 };
          } else {
            throw new Error("Failed to save ratings offline");
          }
        }
        
        // Call the API first
        const res = await apiRequest('POST', apiBatchEndpoint, { ratings, batchNumber });
        const apiResponse = await res.json();
        
        // If API call succeeds, save to Firestore as well
        await saveBatchToFirestore(ratings);
        
        return apiResponse;
      } catch (error) {
        console.error("Error saving batch ratings:", error);
        showErrorToast(error as Error, "Failed to Save Ratings");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          const success = await saveBatchToFirestore(ratings);
          if (success) {
            toast({
              title: "Saved Offline",
              description: "Your ratings were saved locally and will sync when you're back online",
            });
            return { success: true, offline: true, progress: 100 };
          }
        }
        
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [apiRatingsEndpoint] });
      
      // If we're in onboarding mode, also invalidate the onboarding state
      if (isOnboarding) {
        queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      }
      
      // Show success toast with progress if provided
      if (data.offline) {
        toast({
          title: "Ratings saved offline",
          description: "Your ratings will be synced when you're back online",
        });
      } else if (data.progress) {
        toast({
          title: "Ratings saved",
          description: `Progress: ${data.progress}%`,
        });
      } else {
        toast({
          title: "Ratings saved",
          description: "Your ratings have been saved successfully",
        });
      }
      
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

  // Load ratings from Firestore for fallback/offline capabilities
  const loadRatingsFromFirestore = async (): Promise<FilmRating[]> => {
    if (!user) return [];
    
    try {
      // Determine which collection to query based on onboarding flag
      const ratingsCollection = isOnboarding 
        ? await firestore.getOnboardingRatings(user.id)
        : await firestore.queryCollection(
            `users/${user.id}/recommendationRatings`,
            [],
            [['timestamp', 'desc']],
            0,
            { logCategory: LogCategory.RATING }
          );
      
      // Convert to FilmRating format
      const ratings = ratingsCollection.map(item => {
        if (isOnboarding) {
          return {
            filmId: item.filmId,
            title: item.title,
            rating: item.rating,
            status: item.status || 'completed',
            timestamp: item.timestamp
          } as FilmRating;
        } else {
          // Convert good/bad to 5/1 star rating
          return {
            filmId: item.filmId,
            title: item.title,
            rating: item.rating === 'good' ? 5 : 1,
            status: 'completed',
            timestamp: item.timestamp
          } as FilmRating;
        }
      });
      
      // Log success
      console.log(`Loaded ${ratings.length} ratings from Firestore (${isOnboarding ? 'onboarding' : 'recommendation'})`);
      
      return ratings;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Load Ratings from Firestore");
      return [];
    }
  };

  // Function to sync ratings between API and Firestore (for offline recovery)
  const syncRatings = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // First try to get ratings from API
      const apiRatings = ratingsData?.ratings || [];
      
      // Then get ratings from Firestore
      const firestoreRatings = await loadRatingsFromFirestore();
      
      // Compare and merge ratings
      if (firestoreRatings.length > 0) {
        // Find any ratings that exist in Firestore but not in API
        const apiRatingIds = new Set(apiRatings.map(rating => rating.filmId));
        const ratingsToSync = firestoreRatings.filter(rating => !apiRatingIds.has(rating.filmId));
        
        // If there are ratings to sync back to API
        if (ratingsToSync.length > 0) {
          console.log(`Syncing ${ratingsToSync.length} ratings from Firestore to API...`);
          
          // Batch sync to API
          await rateBatchMutation.mutateAsync({ 
            ratings: ratingsToSync,
            batchNumber: 1
          });
          
          toast({
            title: "Ratings Synced",
            description: `${ratingsToSync.length} offline ratings have been synced`,
          });
          
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing ratings:", error);
      showErrorToast(error as Error, "Failed to Sync Ratings");
      return false;
    }
  };

  // Get offline status
  const getOfflineStatus = async (): Promise<boolean> => {
    // Check if we're online now
    if (navigator.onLine && isOffline) {
      setIsOffline(false);
      // Try to sync data if we just came back online
      await syncRatings();
      return false;
    }
    
    return !navigator.onLine || isOffline;
  };

  return {
    // Film queries
    getFilmsQuery,
    
    // Ratings
    ratings: ratingsData?.ratings || [],
    isLoadingRatings,
    refetchRatings,
    ratingsError,
    isOffline,
    
    // Mutations
    rateFilm: rateFilmMutation.mutate,
    rateBatch: rateBatchMutation.mutate,
    
    // Mutation states
    isRatingFilm: rateFilmMutation.isPending,
    isRatingBatch: rateBatchMutation.isPending,
    
    // Firestore specific functions
    loadRatingsFromFirestore,
    syncRatings,
    getOfflineStatus,
    
    // Firestore collections
    firestore,
  };
}