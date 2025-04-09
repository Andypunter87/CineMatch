import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  UserX, 
  Mail, 
  User as UserIcon, 
  Clock, 
  Check, 
  X, 
  RefreshCw, 
  Loader2 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface FriendRequestResponse {
  id: number;
  status: string;
  email: string;
  friendName?: string;
  inviteCode: string;
  userId: number;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    name?: string;
    email: string;
  };
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [friendName, setFriendName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  
  // Get URL parameters for friend invitation acceptance
  const searchParams = new URLSearchParams(window.location.search);
  const inviteCode = searchParams.get('accept');

  // Accept friend request mutation
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/friend-requests/accept", { inviteCode: code });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request accepted",
        description: "You have been added as friends",
      });
      // Remove the invite code from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      refetchFriends();
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      // Remove the invite code from URL even on error
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  });

  // Accept friend request from URL if present
  useEffect(() => {
    if (inviteCode && user && !acceptingInvite) {
      setAcceptingInvite(true);
      acceptFriendRequestMutation.mutate(inviteCode);
    }
  }, [inviteCode, user, acceptingInvite, acceptFriendRequestMutation]);

  // Get friends list
  const { 
    data: friends, 
    isLoading: friendsLoading, 
    error: friendsError,
    refetch: refetchFriends
  } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user
  });

  // Get friend requests
  const { 
    data: friendRequests, 
    isLoading: requestsLoading,
    refetch: refetchRequests
  } = useQuery<FriendRequestResponse[]>({
    queryKey: ['/api/friend-requests'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!user
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (data: { email: string, friendName: string }) => {
      const response = await apiRequest("POST", "/api/friend-requests", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend invitation sent",
        description: "We'll notify you when they accept your request",
      });
      setEmail("");
      setFriendName("");
      setInviteOpen(false);
      refetchFriends();
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: number) => {
      await apiRequest("DELETE", `/api/friends/${friendId}`);
    },
    onSuccess: () => {
      toast({
        title: "Friend removed",
        description: "The friend has been removed from your list",
      });
      refetchFriends();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove friend",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Handle friend request response (accept/reject)
  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'accept' | 'reject' }) => {
      await apiRequest("PATCH", `/api/friend-requests/${requestId}`, { status: action });
    },
    onSuccess: () => {
      toast({
        title: "Request updated",
        description: "The friend request has been processed",
      });
      refetchFriends();
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process request",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Submit friend invitation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!friendName || friendName.trim() === '') {
      toast({
        title: "Friend's name is required",
        description: "Please enter your friend's name",
        variant: "destructive",
      });
      return;
    }
    
    addFriendMutation.mutate({ email, friendName });
  };

  // Filter requests by status
  const pendingRequests = friendRequests?.filter(req => req.status === 'pending') || [];
  const sentRequests = friendRequests?.filter(req => req.status === 'pending' && req.userId === user?.id) || [];
  const receivedRequests = friendRequests?.filter(req => req.status === 'pending' && req.userId !== user?.id) || [];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Please log in</h2>
              <p className="text-gray-500 mt-2">You need to be logged in to manage your friends.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (friendsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-500">Error loading friends</h2>
              <p className="text-gray-500 mt-2">
                {friendsError instanceof Error ? friendsError.message : "An unknown error occurred"}
              </p>
              <Button onClick={() => refetchFriends()} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Friends</h1>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500">
              <UserPlus className="mr-2 h-4 w-4" /> Invite Friend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a Friend</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Friend's Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter their name"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Friend's Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter their email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                disabled={addFriendMutation.isPending}
              >
                {addFriendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="friends">
        <TabsList className="mb-4">
          <TabsTrigger value="friends">
            Friends ({friends?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Pending Requests ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friendsLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : friends && friends.length > 0 ? (
              friends.map((friend) => (
                <Card key={friend.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <div className="bg-blue-100 rounded-full p-2">
                            <UserIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <h3 className="font-semibold">
                              {friend.name || friend.username}
                            </h3>
                            <p className="text-sm text-gray-500">{friend.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => removeFriendMutation.mutate(friend.id)}
                          disabled={removeFriendMutation.isPending}
                        >
                          {removeFriendMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="font-medium text-gray-900 mb-1">No friends yet</h3>
                <p className="text-gray-500 mb-5">
                  Start by inviting your friends to join your CineMatch experience
                </p>
                <Button 
                  onClick={() => setInviteOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Friends
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-8">
            {/* Received Requests */}
            {receivedRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Friend Requests Received</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {receivedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-yellow-100 rounded-full p-2">
                              <UserIcon className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="ml-3">
                              <h4 className="font-medium">
                                {request.user?.name || request.user?.username || request.email}
                              </h4>
                              <p className="text-sm text-gray-500">{request.email}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleRequestMutation.mutate({ requestId: request.id, action: 'reject' })}
                              disabled={handleRequestMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-green-500 to-teal-400 hover:from-green-600 hover:to-teal-500"
                              onClick={() => handleRequestMutation.mutate({ requestId: request.id, action: 'accept' })}
                              disabled={handleRequestMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Invitations Sent</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-blue-50 rounded-full p-2">
                              <Mail className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="ml-3">
                              <h4 className="font-medium">{request.friendName || 'Friend'}</h4>
                              <p className="text-sm text-gray-500">{request.email}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>Pending response</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => handleRequestMutation.mutate({ requestId: request.id, action: 'reject' })}
                            disabled={handleRequestMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="font-medium text-gray-900 mb-1">No pending requests</h3>
                <p className="text-gray-500">
                  Requests will appear here when you send or receive friend invitations
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}