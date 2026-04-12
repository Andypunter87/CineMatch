import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { Film } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { FilmRating } from "@/lib/types/film-rating";
import { useErrorToast } from "@/lib/error-utils";

export function useFilmRatings(isOnboarding = false) {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();

  const apiEndpoint = isOnboarding ? '/api/onboarding/rate' : '/api/films/rate';
  const apiBatchEndpoint = isOnboarding ? '/api/onboarding/rate-batch' : '/api/films/rate-batch';
  const apiRatingsEndpoint = isOnboarding ? '/api/onboarding/ratings' : '/api/films/user-ratings';

  const getFilmsQuery = (count = 12, offset = 0, batchNumber = 1) => {
    const endpoint = isOnboarding ? '/api/onboarding/films' : '/api/films/popular';

    return useQuery<{ films: Film[] }>({
      queryKey: [endpoint, count, offset, batchNumber],
      queryFn: getQueryFn({
        on401: "returnNull",
        onError: (error) => {
          showErrorToast(error, "Failed to Load Films");
        },
      }),
      retry: 2,
      retryDelay: 1000,
    });
  };

  const {
    data: ratingsData,
    isLoading: isLoadingRatings,
    refetch: refetchRatings,
    error: ratingsError,
  } = useQuery<{ ratings: FilmRating[] }>({
    queryKey: [apiRatingsEndpoint],
    queryFn: getQueryFn({
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Ratings");
      },
    }),
    retry: 1,
    enabled: !!user,
  });

  const rateFilmMutation = useMutation({
    mutationFn: async (rating: FilmRating) => {
      const res = await apiRequest('POST', apiEndpoint, rating);
      const apiResponse = await res.json();

      const currentRatings = queryClient.getQueryData<{ ratings: FilmRating[] }>([apiRatingsEndpoint]);
      if (currentRatings) {
        const updatedRatings = [...currentRatings.ratings];
        const existingIndex = updatedRatings.findIndex((r) => r.filmId === rating.filmId);
        if (existingIndex >= 0) {
          updatedRatings[existingIndex] = rating;
        } else {
          updatedRatings.push(rating);
        }
        queryClient.setQueryData([apiRatingsEndpoint], { ratings: updatedRatings });
      }

      return apiResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiRatingsEndpoint] });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Rate Film");
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

      if (data.complete) {
        queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      }
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Save Ratings");
    },
  });

  return {
    getFilmsQuery,

    ratings: ratingsData?.ratings || [],
    isLoadingRatings,
    refetchRatings,
    ratingsError,

    rateFilm: rateFilmMutation.mutate,
    rateBatch: rateBatchMutation.mutate,

    isRatingFilm: rateFilmMutation.isPending,
    isRatingBatch: rateBatchMutation.isPending,
  };
}
