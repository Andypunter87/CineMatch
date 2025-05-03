import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollections } from "./use-firestore-collections";
import { useErrorToast } from "@/lib/error-utils";
import { useState } from "react";
import { LogCategory } from "@/lib/firestore-test-logger";

// Type for watchlist items
interface WatchlistItem {
  filmId: number;
  title: string;
  posterUrl?: string;
  year?: number;
  genres?: string[];
  addedAt: string;
  watched?: boolean;
}

/**
 * Hook for managing user watchlist using the unified Firestore schema
 * Persists data to both the server API and Firestore subcollections
 */
export function useWatchlist() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);

  // Use the firestore collections hook
  const firestore = useFirestoreCollections();

  // API endpoints
  const apiEndpoint = '/api/watchlist';
  const apiAddEndpoint = '/api/watchlist/add';
  const apiRemoveEndpoint = '/api/watchlist/remove';

  // Get the user's watchlist with error handling
  const { 
    data: watchlistData, 
    isLoading: isLoadingWatchlist, 
    refetch: refetchWatchlist,
    error: watchlistError 
  } = useQuery<{ items: WatchlistItem[] }>({
    queryKey: [apiEndpoint],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        // If there's a network error, try to load from Firestore as fallback
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setIsOffline(true);
          loadWatchlistFromFirestore().then(items => {
            queryClient.setQueryData([apiEndpoint], { items });
          });
        }
        showErrorToast(error, "Failed to Load Watchlist");
      }
    }),
    retry: 1,
    enabled: !!user
  });

  // Add a film to the watchlist via both API and Firestore
  const addToWatchlistMutation = useMutation({
    mutationFn: async (film: WatchlistItem) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          if (user) {
            const success = await firestore.addToWatchlist(
              user.id,
              film.filmId,
              {
                title: film.title,
                posterUrl: film.posterUrl,
                year: film.year,
                genres: film.genres
              }
            );
            
            if (success) {
              // Update local cache
              const currentWatchlist = queryClient.getQueryData<{ items: WatchlistItem[] }>([apiEndpoint]) || { items: [] };
              const updatedWatchlist = [...currentWatchlist.items, film];
              queryClient.setQueryData([apiEndpoint], { items: updatedWatchlist });
              
              return { success: true, message: "Added to watchlist offline" };
            } else {
              throw new Error("Failed to add to watchlist offline");
            }
          }
          throw new Error("User not authenticated");
        }
        
        // Call API
        const res = await apiRequest('POST', apiAddEndpoint, film);
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        if (user) {
          await firestore.addToWatchlist(
            user.id,
            film.filmId,
            {
              title: film.title,
              posterUrl: film.posterUrl,
              year: film.year,
              genres: film.genres
            }
          );
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error adding to watchlist:", error);
        showErrorToast(error as Error, "Failed to Add to Watchlist");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          if (user) {
            const success = await firestore.addToWatchlist(
              user.id,
              film.filmId,
              {
                title: film.title,
                posterUrl: film.posterUrl,
                year: film.year,
                genres: film.genres
              }
            );
            
            if (success) {
              toast({
                title: "Added Offline",
                description: "Film added to watchlist locally and will sync when you're back online",
              });
              return { success: true, offline: true };
            }
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      
      toast({
        title: "Added to Watchlist",
        description: "Film has been added to your watchlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to watchlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove a film from the watchlist via both API and Firestore
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (filmId: number) => {
      try {
        // If offline, only update Firestore
        if (isOffline) {
          if (user) {
            const success = await firestore.removeFromWatchlist(user.id, filmId);
            
            if (success) {
              // Update local cache
              const currentWatchlist = queryClient.getQueryData<{ items: WatchlistItem[] }>([apiEndpoint]) || { items: [] };
              const updatedWatchlist = currentWatchlist.items.filter(item => item.filmId !== filmId);
              queryClient.setQueryData([apiEndpoint], { items: updatedWatchlist });
              
              return { success: true, message: "Removed from watchlist offline" };
            } else {
              throw new Error("Failed to remove from watchlist offline");
            }
          }
          throw new Error("User not authenticated");
        }
        
        // Call API
        const res = await apiRequest('DELETE', `${apiRemoveEndpoint}/${filmId}`);
        const apiResponse = await res.json();
        
        // If API succeeded, also remove from Firestore
        if (user) {
          await firestore.removeFromWatchlist(user.id, filmId);
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error removing from watchlist:", error);
        showErrorToast(error as Error, "Failed to Remove from Watchlist");
        
        // Check if it's a network error and try removing locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          if (user) {
            const success = await firestore.removeFromWatchlist(user.id, filmId);
            
            if (success) {
              toast({
                title: "Removed Offline",
                description: "Film removed from watchlist locally and will sync when you're back online",
              });
              return { success: true, offline: true };
            }
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      
      toast({
        title: "Removed from Watchlist",
        description: "Film has been removed from your watchlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove from watchlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load watchlist from Firestore
  const loadWatchlistFromFirestore = async (): Promise<WatchlistItem[]> => {
    if (!user) return [];
    
    try {
      const watchlistItems = await firestore.getWatchlist(user.id);
      
      // Log success
      console.log(`Loaded ${watchlistItems.length} watchlist items from Firestore`);
      
      return watchlistItems as WatchlistItem[];
    } catch (error) {
      showErrorToast(error as Error, "Failed to Load Watchlist from Firestore");
      return [];
    }
  };

  // Check if a film is in the watchlist
  const isInWatchlist = (filmId: number): boolean => {
    return watchlistData?.items.some(item => item.filmId === filmId) || false;
  };

  // Sync watchlist between API and Firestore
  const syncWatchlist = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get items from API and Firestore
      const apiItems = watchlistData?.items || [];
      const firestoreItems = await loadWatchlistFromFirestore();
      
      // Check for differences - items in Firestore but not in API
      const apiItemIds = new Set(apiItems.map(item => item.filmId));
      const itemsToSync = firestoreItems.filter(item => !apiItemIds.has(item.filmId));
      
      if (itemsToSync.length > 0) {
        console.log(`Syncing ${itemsToSync.length} watchlist items from Firestore to API...`);
        
        // Add each missing item
        for (const item of itemsToSync) {
          await addToWatchlistMutation.mutateAsync(item);
        }
        
        toast({
          title: "Watchlist Synced",
          description: `${itemsToSync.length} offline watchlist items have been synced`,
        });
        
        return true;
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing watchlist:", error);
      showErrorToast(error as Error, "Failed to Sync Watchlist");
      return false;
    }
  };

  return {
    // Data
    watchlist: watchlistData?.items || [],
    isLoadingWatchlist,
    refetchWatchlist,
    watchlistError,
    isOffline,
    
    // Mutations
    addToWatchlist: addToWatchlistMutation.mutate,
    removeFromWatchlist: removeFromWatchlistMutation.mutate,
    
    // Mutation states
    isAddingToWatchlist: addToWatchlistMutation.isPending,
    isRemovingFromWatchlist: removeFromWatchlistMutation.isPending,
    
    // Helpers
    isInWatchlist,
    loadWatchlistFromFirestore,
    syncWatchlist,
    
    // Firestore access
    firestore,
  };
}