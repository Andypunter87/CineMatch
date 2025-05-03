import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollections } from "./use-firestore-collections";
import { useErrorToast } from "@/lib/error-utils";
import { useState } from "react";
import { LogCategory } from "@/lib/firestore-test-logger";

// Friend status types
export type FriendStatus = 'accepted' | 'pending' | 'blocked';

// Types for friend data
export interface Friend {
  id: string | number;
  friendId: string | number;
  userId?: string | number;
  username?: string;
  name?: string;
  email?: string;
  status: FriendStatus;
  friendSince: string;
  updatedAt?: string;
}

/**
 * Hook for managing friend connections using the unified Firestore schema
 * Persists data to both the server API and Firestore subcollections
 */
export function useFriends() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);

  // Use the firestore collections hook
  const firestore = useFirestoreCollections();

  // API endpoints
  const apiFriendsEndpoint = '/api/friends';
  const apiAddFriendEndpoint = '/api/friends/add';
  const apiUpdateFriendEndpoint = '/api/friends/update';
  const apiRemoveFriendEndpoint = '/api/friends/remove';

  // Get user's friends with error handling
  const { 
    data: friendsData, 
    isLoading: isLoadingFriends, 
    refetch: refetchFriends,
    error: friendsError 
  } = useQuery<{ friends: Friend[] }>({
    queryKey: [apiFriendsEndpoint],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        // If there's a network error, try to load from Firestore as fallback
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setIsOffline(true);
          loadFriendsFromFirestore().then(friends => {
            queryClient.setQueryData([apiFriendsEndpoint], { friends });
          });
        }
        showErrorToast(error, "Failed to Load Friends");
      }
    }),
    retry: 1,
    enabled: !!user
  });

  // Get pending friend requests with error handling
  const { 
    data: pendingData, 
    isLoading: isLoadingPending, 
    refetch: refetchPending
  } = useQuery<{ friends: Friend[] }>({
    queryKey: [apiFriendsEndpoint, 'pending'],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Friend Requests");
      }
    }),
    retry: 1,
    enabled: !!user
  });

  // Add a friend connection via both API and Firestore
  const addFriendMutation = useMutation({
    mutationFn: async (friendData: { 
      friendId: string | number;
      status?: FriendStatus;
      email?: string;
      name?: string;
      username?: string;
    }) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          if (user) {
            const success = await firestore.addFriend(
              user.id,
              friendData.friendId,
              friendData.status || 'pending'
            );
            
            if (success) {
              // Update local cache
              const currentFriends = queryClient.getQueryData<{ friends: Friend[] }>([apiFriendsEndpoint]) || { friends: [] };
              const newFriend: Friend = {
                id: `${user.id}-${friendData.friendId}`,
                friendId: friendData.friendId,
                userId: user.id,
                username: friendData.username,
                name: friendData.name,
                email: friendData.email,
                status: friendData.status || 'pending',
                friendSince: new Date().toISOString()
              };
              const updatedFriends = [...currentFriends.friends, newFriend];
              queryClient.setQueryData([apiFriendsEndpoint], { friends: updatedFriends });
              
              return { success: true, message: "Friend request saved offline" };
            } else {
              throw new Error("Failed to save friend request offline");
            }
          }
          throw new Error("User not authenticated");
        }
        
        // Call API
        const res = await apiRequest('POST', apiAddFriendEndpoint, friendData);
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        if (user) {
          await firestore.addFriend(
            user.id,
            friendData.friendId,
            friendData.status || 'pending'
          );
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error adding friend:", error);
        showErrorToast(error as Error, "Failed to Add Friend");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          if (user) {
            const success = await firestore.addFriend(
              user.id,
              friendData.friendId,
              friendData.status || 'pending'
            );
            
            if (success) {
              toast({
                title: "Saved Offline",
                description: "Friend request saved locally and will sync when you're back online",
              });
              return { success: true, offline: true };
            }
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiFriendsEndpoint] });
      
      toast({
        title: "Friend Request Sent",
        description: "Friend request has been sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update a friend connection status via both API and Firestore
  const updateFriendStatusMutation = useMutation({
    mutationFn: async ({ 
      friendId, 
      status 
    }: { 
      friendId: string | number; 
      status: FriendStatus; 
    }) => {
      try {
        // If offline, only update Firestore
        if (isOffline) {
          if (user) {
            const success = await firestore.updateFriendStatus(
              user.id,
              friendId,
              status
            );
            
            if (success) {
              // Update local cache
              const currentFriends = queryClient.getQueryData<{ friends: Friend[] }>([apiFriendsEndpoint]) || { friends: [] };
              const updatedFriends = currentFriends.friends.map(friend => {
                if (friend.friendId === friendId) {
                  return { ...friend, status };
                }
                return friend;
              });
              queryClient.setQueryData([apiFriendsEndpoint], { friends: updatedFriends });
              
              return { success: true, message: `Friend status updated to ${status} offline` };
            } else {
              throw new Error(`Failed to update friend status to ${status} offline`);
            }
          }
          throw new Error("User not authenticated");
        }
        
        // Call API
        const res = await apiRequest('PUT', apiUpdateFriendEndpoint, { friendId, status });
        const apiResponse = await res.json();
        
        // If API succeeded, also update Firestore
        if (user) {
          await firestore.updateFriendStatus(
            user.id,
            friendId,
            status
          );
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error updating friend status:", error);
        showErrorToast(error as Error, "Failed to Update Friend Status");
        
        // Check if it's a network error and try updating locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          if (user) {
            const success = await firestore.updateFriendStatus(
              user.id,
              friendId,
              status
            );
            
            if (success) {
              toast({
                title: "Updated Offline",
                description: "Friend status updated locally and will sync when you're back online",
              });
              return { success: true, offline: true };
            }
          }
        }
        
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [apiFriendsEndpoint] });
      
      const statusText = variables.status === 'accepted' 
        ? 'accepted' 
        : variables.status === 'blocked' 
          ? 'blocked' 
          : 'updated';
      
      toast({
        title: "Friend Status Updated",
        description: `Friend request has been ${statusText}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update friend status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove a friend connection via both API and Firestore
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string | number) => {
      try {
        // If offline, only update Firestore
        if (isOffline) {
          if (user) {
            const success = await firestore.removeFriend(
              user.id,
              friendId
            );
            
            if (success) {
              // Update local cache
              const currentFriends = queryClient.getQueryData<{ friends: Friend[] }>([apiFriendsEndpoint]) || { friends: [] };
              const updatedFriends = currentFriends.friends.filter(friend => friend.friendId !== friendId);
              queryClient.setQueryData([apiFriendsEndpoint], { friends: updatedFriends });
              
              return { success: true, message: "Friend removed offline" };
            } else {
              throw new Error("Failed to remove friend offline");
            }
          }
          throw new Error("User not authenticated");
        }
        
        // Call API
        const res = await apiRequest('DELETE', `${apiRemoveFriendEndpoint}/${friendId}`);
        const apiResponse = await res.json();
        
        // If API succeeded, also remove from Firestore
        if (user) {
          await firestore.removeFriend(
            user.id,
            friendId
          );
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error removing friend:", error);
        showErrorToast(error as Error, "Failed to Remove Friend");
        
        // Check if it's a network error and try removing locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          if (user) {
            const success = await firestore.removeFriend(
              user.id,
              friendId
            );
            
            if (success) {
              toast({
                title: "Removed Offline",
                description: "Friend removed locally and will sync when you're back online",
              });
              return { success: true, offline: true };
            }
          }
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiFriendsEndpoint] });
      
      toast({
        title: "Friend Removed",
        description: "Friend has been removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove friend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load friends from Firestore for fallback/offline capabilities
  const loadFriendsFromFirestore = async (): Promise<Friend[]> => {
    if (!user) return [];
    
    try {
      const firestoreFriends = await firestore.getFriends(user.id);
      
      // Convert to Friend format - note that we'll have limited info from Firestore
      const friends = firestoreFriends.map(item => ({
        id: `${user.id}-${item.friendId}`,
        friendId: item.friendId,
        userId: user.id,
        status: item.status as FriendStatus,
        friendSince: item.friendSince || new Date().toISOString(),
        updatedAt: item.updatedAt
      }));
      
      // Log success
      console.log(`Loaded ${friends.length} friends from Firestore`);
      
      return friends;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Load Friends from Firestore");
      return [];
    }
  };

  // Check if someone is a friend
  const isFriend = (friendId: string | number): boolean => {
    return friendsData?.friends.some(friend => 
      friend.friendId.toString() === friendId.toString() && 
      friend.status === 'accepted'
    ) || false;
  };

  // Check if there's a pending request
  const hasPendingRequest = (friendId: string | number): boolean => {
    return friendsData?.friends.some(friend => 
      friend.friendId.toString() === friendId.toString() && 
      friend.status === 'pending'
    ) || false;
  };

  // Sync friends between API and Firestore (for offline recovery)
  const syncFriends = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get friends from API and Firestore
      const apiFriends = friendsData?.friends || [];
      const firestoreFriends = await loadFriendsFromFirestore();
      
      // Check for differences
      const apiFriendIds = new Set(apiFriends.map(friend => friend.friendId.toString()));
      const friendsToSync = firestoreFriends.filter(friend => 
        !apiFriendIds.has(friend.friendId.toString())
      );
      
      if (friendsToSync.length > 0) {
        console.log(`Syncing ${friendsToSync.length} friends from Firestore to API...`);
        
        // Sync each friend
        for (const friend of friendsToSync) {
          await addFriendMutation.mutateAsync({
            friendId: friend.friendId,
            status: friend.status
          });
        }
        
        toast({
          title: "Friends Synced",
          description: `${friendsToSync.length} offline friend connections have been synced`,
        });
        
        return true;
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing friends:", error);
      showErrorToast(error as Error, "Failed to Sync Friends");
      return false;
    }
  };

  return {
    // Data
    friends: friendsData?.friends.filter(friend => friend.status === 'accepted') || [],
    pendingFriends: pendingData?.friends || friendsData?.friends.filter(friend => friend.status === 'pending') || [],
    allFriends: friendsData?.friends || [],
    isLoadingFriends,
    refetchFriends,
    friendsError,
    isOffline,
    
    // Mutations
    addFriend: addFriendMutation.mutate,
    updateFriendStatus: updateFriendStatusMutation.mutate,
    removeFriend: removeFriendMutation.mutate,
    
    // Mutation states
    isAddingFriend: addFriendMutation.isPending,
    isUpdatingFriend: updateFriendStatusMutation.isPending,
    isRemovingFriend: removeFriendMutation.isPending,
    
    // Helpers
    isFriend,
    hasPendingRequest,
    loadFriendsFromFirestore,
    syncFriends,
    
    // Firestore access
    firestore,
  };
}