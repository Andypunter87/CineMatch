import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useErrorToast } from "@/lib/error-utils";
import { WatchlistItem } from "@shared/schema";

export function useWatchlist() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();

  const apiEndpoint = '/api/watchlist';

  const {
    data: watchlistItems,
    isLoading: isLoadingWatchlist,
    refetch: refetchWatchlist,
    error: watchlistError,
  } = useQuery<WatchlistItem[]>({
    queryKey: [apiEndpoint],
    queryFn: getQueryFn({
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Watchlist");
      },
    }),
    retry: 1,
    enabled: !!user,
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (film: {
      filmId: number;
      filmTitle: string;
      filmYear?: number;
      filmGenres?: string[];
      filmPosterUrl?: string;
      recommendationContext?: unknown;
    }) => {
      const res = await apiRequest('POST', apiEndpoint, film);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({
        title: "Added to Watchlist",
        description: "Film has been added to your watchlist",
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Add to Watchlist");
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `${apiEndpoint}/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      toast({
        title: "Removed from Watchlist",
        description: "Film has been removed from your watchlist",
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Remove from Watchlist");
    },
  });

  const updateWatchlistItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<WatchlistItem> }) => {
      const res = await apiRequest('PUT', `${apiEndpoint}/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Update Watchlist Item");
    },
  });

  const isInWatchlist = (filmId: number): boolean => {
    return watchlistItems?.some((item) => item.filmId === filmId) || false;
  };

  const getWatchlistItem = (filmId: number): WatchlistItem | undefined => {
    return watchlistItems?.find((item) => item.filmId === filmId);
  };

  return {
    watchlist: watchlistItems || [],
    isLoadingWatchlist,
    refetchWatchlist,
    watchlistError,

    addToWatchlist: addToWatchlistMutation.mutate,
    removeFromWatchlist: removeFromWatchlistMutation.mutate,
    updateWatchlistItem: updateWatchlistItemMutation.mutate,

    isAddingToWatchlist: addToWatchlistMutation.isPending,
    isRemovingFromWatchlist: removeFromWatchlistMutation.isPending,
    isUpdatingWatchlistItem: updateWatchlistItemMutation.isPending,

    isInWatchlist,
    getWatchlistItem,
  };
}
