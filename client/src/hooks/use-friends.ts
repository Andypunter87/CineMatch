import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useErrorToast } from "@/lib/error-utils";

export type FriendStatus = 'accepted' | 'pending' | 'blocked';

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

export function useFriends() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();

  const apiFriendsEndpoint = '/api/friends';
  const apiAddFriendEndpoint = '/api/friends/add';
  const apiUpdateFriendEndpoint = '/api/friends/update';
  const apiRemoveFriendEndpoint = '/api/friends/remove';

  const {
    data: friendsData,
    isLoading: isLoadingFriends,
    refetch: refetchFriends,
    error: friendsError,
  } = useQuery<{ friends: Friend[] }>({
    queryKey: [apiFriendsEndpoint],
    queryFn: getQueryFn({
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Friends");
      },
    }),
    retry: 1,
    enabled: !!user,
  });

  const {
    data: pendingData,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useQuery<{ friends: Friend[] }>({
    queryKey: [apiFriendsEndpoint, 'pending'],
    queryFn: getQueryFn({
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Friend Requests");
      },
    }),
    retry: 1,
    enabled: !!user,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendData: {
      friendId: string | number;
      status?: FriendStatus;
      email?: string;
      name?: string;
      username?: string;
    }) => {
      const res = await apiRequest('POST', apiAddFriendEndpoint, friendData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiFriendsEndpoint] });
      toast({
        title: "Friend Request Sent",
        description: "Friend request has been sent successfully",
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Add Friend");
    },
  });

  const updateFriendStatusMutation = useMutation({
    mutationFn: async ({ friendId, status }: { friendId: string | number; status: FriendStatus }) => {
      const res = await apiRequest('PUT', apiUpdateFriendEndpoint, { friendId, status });
      return res.json();
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
      showErrorToast(error, "Failed to Update Friend Status");
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string | number) => {
      const res = await apiRequest('DELETE', `${apiRemoveFriendEndpoint}/${friendId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiFriendsEndpoint] });
      toast({
        title: "Friend Removed",
        description: "Friend has been removed successfully",
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Remove Friend");
    },
  });

  const isFriend = (friendId: string | number): boolean => {
    return friendsData?.friends.some(
      (friend) => friend.friendId.toString() === friendId.toString() && friend.status === 'accepted'
    ) || false;
  };

  const hasPendingRequest = (friendId: string | number): boolean => {
    return friendsData?.friends.some(
      (friend) => friend.friendId.toString() === friendId.toString() && friend.status === 'pending'
    ) || false;
  };

  return {
    friends: friendsData?.friends.filter((f) => f.status === 'accepted') || [],
    pendingFriends: pendingData?.friends || friendsData?.friends.filter((f) => f.status === 'pending') || [],
    allFriends: friendsData?.friends || [],
    isLoadingFriends,
    isLoadingPending,
    refetchFriends,
    refetchPending,
    friendsError,

    addFriend: addFriendMutation.mutate,
    updateFriendStatus: updateFriendStatusMutation.mutate,
    removeFriend: removeFriendMutation.mutate,

    isAddingFriend: addFriendMutation.isPending,
    isUpdatingFriend: updateFriendStatusMutation.isPending,
    isRemovingFriend: removeFriendMutation.isPending,

    isFriend,
    hasPendingRequest,
  };
}
