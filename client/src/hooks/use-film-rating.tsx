import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { Film } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { FilmRating } from "@/lib/types/film-rating";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  getDoc,
  writeBatch
} from "firebase/firestore";

/**
 * A hook for handling film ratings with persistence to both the server API and Firestore
 */
export function useFilmRating(isOnboarding = false) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate a Firestore collection path for film ratings based on whether it's onboarding or regular ratings
  const getFirestoreCollectionPath = () => {
    if (!user) return null;
    return isOnboarding 
      ? `users/${user.id}/onboardingRatings` 
      : `users/${user.id}/filmRatings`;
  };

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
      queryFn: getQueryFn({ on401: "returnNull" }),
      retry: false,
    });
  };

  // Get all user's ratings
  const { data: ratingsData, isLoading: isLoadingRatings, refetch: refetchRatings } = useQuery<{ ratings: FilmRating[] }>({
    queryKey: [apiRatingsEndpoint],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Save a rating to Firestore
  const saveRatingToFirestore = async (rating: FilmRating) => {
    const collectionPath = getFirestoreCollectionPath();
    if (!collectionPath) return;

    try {
      // Use the filmId as the document ID for easy retrieval later
      const ratingRef = doc(db, collectionPath, `film-${rating.filmId}`);
      
      await setDoc(ratingRef, {
        ...rating,
        updatedAt: serverTimestamp(),
        userId: user?.id
      });
      
      console.log(`Rating saved to Firestore for film ${rating.filmId}`);
    } catch (error) {
      console.error("Error saving rating to Firestore:", error);
      throw error;
    }
  };

  // Save multiple ratings to Firestore in a batch
  const saveBatchToFirestore = async (ratings: FilmRating[]) => {
    const collectionPath = getFirestoreCollectionPath();
    if (!collectionPath || !ratings.length) return;

    try {
      const batch = writeBatch(db);
      
      ratings.forEach(rating => {
        const ratingRef = doc(db, collectionPath, `film-${rating.filmId}`);
        batch.set(ratingRef, {
          ...rating,
          updatedAt: serverTimestamp(),
          userId: user?.id
        });
      });
      
      await batch.commit();
      console.log(`${ratings.length} ratings saved to Firestore in batch`);
    } catch (error) {
      console.error("Error saving batch ratings to Firestore:", error);
      throw error;
    }
  };

  // Rate a single film - persists to both API and Firestore
  const rateFilmMutation = useMutation({
    mutationFn: async (rating: FilmRating) => {
      // Call the API first
      const res = await apiRequest('POST', apiEndpoint, rating);
      const apiResponse = await res.json();
      
      // If API call succeeds, save to Firestore as well
      await saveRatingToFirestore(rating);
      
      return apiResponse;
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
      // Call the API first
      const res = await apiRequest('POST', apiBatchEndpoint, { ratings, batchNumber });
      const apiResponse = await res.json();
      
      // If API call succeeds, save to Firestore as well
      await saveBatchToFirestore(ratings);
      
      return apiResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [apiRatingsEndpoint] });
      
      // If we're in onboarding mode, also invalidate the onboarding state
      if (isOnboarding) {
        queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      }
      
      // Show success toast with progress if provided
      if (data.progress) {
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
    const collectionPath = getFirestoreCollectionPath();
    if (!collectionPath) return [];

    try {
      const ratingsSnapshot = await getDocs(collection(db, collectionPath));
      const ratings: FilmRating[] = [];
      
      ratingsSnapshot.forEach(doc => {
        const data = doc.data() as Omit<FilmRating, 'updatedAt'> & { updatedAt: any };
        
        // Extract just the FilmRating fields
        ratings.push({
          filmId: data.filmId,
          filmTitle: data.filmTitle,
          filmPosterUrl: data.filmPosterUrl,
          rating: data.rating,
          status: data.status,
        });
      });
      
      return ratings;
    } catch (error) {
      console.error("Error loading ratings from Firestore:", error);
      return [];
    }
  };

  // Function to sync ratings between API and Firestore (for offline recovery)
  const syncRatings = async () => {
    try {
      // First try to get ratings from API
      const apiRatings = ratingsData?.ratings || [];
      
      // Then get ratings from Firestore
      const firestoreRatings = await loadRatingsFromFirestore();
      
      // Compare timestamps/data and sync if needed
      // This is just a placeholder for a more sophisticated syncing mechanism
      if (firestoreRatings.length > apiRatings.length) {
        // Firestore has more ratings than API, potentially due to offline usage
        // Sync back to API
        console.log("Syncing ratings from Firestore to API...");
        // This would involve calling the API batch endpoint with the Firestore ratings
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing ratings:", error);
      return false;
    }
  };

  return {
    // Film queries
    getFilmsQuery,
    
    // Ratings
    ratings: ratingsData?.ratings || [],
    isLoadingRatings,
    refetchRatings,
    
    // Mutations
    rateFilm: rateFilmMutation.mutate,
    rateBatch: rateBatchMutation.mutate,
    
    // Mutation states
    isRatingFilm: rateFilmMutation.isPending,
    isRatingBatch: rateBatchMutation.isPending,
    
    // Firestore specific functions
    loadRatingsFromFirestore,
    syncRatings
  };
}