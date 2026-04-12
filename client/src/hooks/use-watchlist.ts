import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useErrorToast } from "@/lib/error-utils";

interface WatchlistItem {
  filmId: number;
  title: string;
  posterUrl?: string;
  year?: number;
  genres?: string[];
  addedAt: string;
  watched?: boolean;
}

export function useWatchlist() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();

  const apiEndpoint = '/api/watchlist';
  const apiAddEndpoint = '/api/watchlist/add';
  const apiRemoveEndpoint = '/api/watchlist/remove';

  const {
    data: watchlistData,
    isLoading: isLoadingWatchlist,
    refetch: refetchWatchlist,
    error: watchlistError,
  } = useQuery<{ items: WatchlistItem[] }>({
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
    mutationFn: async (film: WatchlistItem) => {
      const res = await apiRequest('POST', apiAddEndpoint, film);
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
    mutationFn: async (filmId: number) => {
      const res = await apiRequest('DELETE', `${apiRemoveEndpoint}/${filmId}`);
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

  const isInWatchlist = (filmId: number): boolean => {
    return watchlistData?.items.some((item) => item.filmId === filmId) || false;
  };

  return {
    watchlist: watchlistData?.items || [],
    isLoadingWatchlist,
    refetchWatchlist,
    watchlistError,

    addToWatchlist: addToWatchlistMutation.mutate,
    removeFromWatchlist: removeFromWatchlistMutation.mutate,

    isAddingToWatchlist: addToWatchlistMutation.isPending,
    isRemovingFromWatchlist: removeFromWatchlistMutation.isPending,

    isInWatchlist,
  };
}
