/**
 * Film rating hook — backed by REST API (PostgreSQL).
 * Firebase/Firestore has been removed.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { Film } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { FilmRating } from "@/lib/types/film-rating";

export function useFilmRating(isOnboarding = false) {
  const { toast } = useToast();

  const apiEndpoint = isOnboarding ? '/api/onboarding/rate' : '/api/films/rate';
  const apiBatchEndpoint = isOnboarding ? '/api/onboarding/rate-batch' : '/api/films/rate-batch';
  const apiRatingsEndpoint = isOnboarding ? '/api/onboarding/ratings' : '/api/films/user-ratings';

  const getFilmsQuery = (count = 12, offset = 0, batchNumber = 1) => {
    const endpoint = isOnboarding ? '/api/onboarding/films' : '/api/films/popular';

    return useQuery<{ films: Film[] }>({
      queryKey: [endpoint, count, offset, batchNumber],
      queryFn: getQueryFn({ on401: "returnNull" }),
      retry: false,
    });
  };

  const { data: ratingsData, isLoading: isLoadingRatings, refetch: refetchRatings } = useQuery<{ ratings: FilmRating[] }>({
    queryKey: [apiRatingsEndpoint],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const rateFilmMutation = useMutation({
    mutationFn: async (rating: FilmRating) => {
      const res = await apiRequest('POST', apiEndpoint, rating);
      return res.json();
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

  const rateBatchMutation = useMutation({
    mutationFn: async ({ ratings, batchNumber = 1 }: { ratings: FilmRating[]; batchNumber?: number }) => {
      const res = await apiRequest('POST', apiBatchEndpoint, { ratings, batchNumber });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [apiRatingsEndpoint] });

      if (isOnboarding) {
        queryClient.invalidateQueries({ queryKey: ['/api/onboarding/state'] });
      }

      if (data.progress) {
        toast({ title: "Ratings saved", description: `Progress: ${data.progress}%` });
      } else {
        toast({ title: "Ratings saved", description: "Your ratings have been saved successfully" });
      }

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

  const loadRatingsFromFirestore = async (): Promise<FilmRating[]> => [];
  const syncRatings = async () => true;

  return {
    getFilmsQuery,
    ratings: ratingsData?.ratings || [],
    isLoadingRatings,
    refetchRatings,
    rateFilm: rateFilmMutation.mutate,
    rateBatch: rateBatchMutation.mutate,
    isRatingFilm: rateFilmMutation.isPending,
    isRatingBatch: rateBatchMutation.isPending,
    loadRatingsFromFirestore,
    syncRatings,
  };
}
