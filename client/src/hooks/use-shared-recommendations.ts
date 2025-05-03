import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollections } from "./use-firestore-collections";
import { useErrorToast } from "@/lib/error-utils";
import { useState } from "react";
import { LogCategory } from "@/lib/firestore-test-logger";
import { Film } from "@shared/schema";

// Types for shared recommendations
export interface SharedRecommendationSession {
  id: string;
  friends: (string | number)[];
  recommendedFilms: number[];
  createdAt: string;
  context?: {
    audience?: string;
    mood?: string;
    duration?: string;
    location?: string;
    [key: string]: any;
  };
  filmDetails?: Film[];
  friendNames?: string[];
}

/**
 * Hook for managing shared recommendation sessions using the unified Firestore schema
 * Persists data to both the server API and Firestore subcollections
 */
export function useSharedRecommendations() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);

  // Use the firestore collections hook
  const firestore = useFirestoreCollections();

  // API endpoints
  const apiSessionsEndpoint = '/api/shared-recommendations';
  const apiCreateSessionEndpoint = '/api/shared-recommendations/create';
  const apiUpdateSessionEndpoint = '/api/shared-recommendations/update';

  // Get user's shared recommendation sessions
  const { 
    data: sessionsData, 
    isLoading: isLoadingSessions, 
    refetch: refetchSessions,
    error: sessionsError 
  } = useQuery<{ sessions: SharedRecommendationSession[] }>({
    queryKey: [apiSessionsEndpoint],
    queryFn: getQueryFn({ 
      on401: "returnNull",
      onError: (error) => {
        // If there's a network error, try to load from Firestore as fallback
        if (error.message.includes('network') || error.message.includes('fetch')) {
          setIsOffline(true);
          loadSessionsFromFirestore().then(sessions => {
            queryClient.setQueryData([apiSessionsEndpoint], { sessions });
          });
        }
        showErrorToast(error, "Failed to Load Shared Recommendations");
      }
    }),
    retry: 1,
    enabled: !!user
  });

  // Create or update a shared recommendation session
  const saveSessionMutation = useMutation({
    mutationFn: async ({ 
      session, 
      sessionId 
    }: { 
      session: Omit<SharedRecommendationSession, 'id' | 'createdAt'>; 
      sessionId?: string;
    }) => {
      try {
        // If offline, only save to Firestore
        if (isOffline) {
          if (user) {
            const result = await firestore.saveSharedRecommendation(
              user.id,
              {
                friendIds: session.friends,
                filmIds: session.recommendedFilms,
                context: session.context
              },
              sessionId
            );
            
            if (result) {
              // Update local cache
              const currentSessions = queryClient.getQueryData<{ sessions: SharedRecommendationSession[] }>([apiSessionsEndpoint]) || { sessions: [] };
              
              if (sessionId) {
                // Update existing session
                const updatedSessions = currentSessions.sessions.map(s => {
                  if (s.id === sessionId) {
                    return {
                      ...s,
                      ...session,
                    };
                  }
                  return s;
                });
                queryClient.setQueryData([apiSessionsEndpoint], { sessions: updatedSessions });
              } else {
                // Add new session
                const newSession: SharedRecommendationSession = {
                  id: result,
                  friends: session.friends,
                  recommendedFilms: session.recommendedFilms,
                  createdAt: new Date().toISOString(),
                  context: session.context
                };
                const updatedSessions = [...currentSessions.sessions, newSession];
                queryClient.setQueryData([apiSessionsEndpoint], { sessions: updatedSessions });
              }
              
              return { 
                success: true, 
                message: `Session ${sessionId ? 'updated' : 'created'} offline`,
                id: result
              };
            } else {
              throw new Error(`Failed to ${sessionId ? 'update' : 'create'} session offline`);
            }
          }
          throw new Error("User not authenticated");
        }
        
        // Call API
        const endpoint = sessionId ? `${apiUpdateSessionEndpoint}/${sessionId}` : apiCreateSessionEndpoint;
        const method = sessionId ? 'PUT' : 'POST';
        
        const res = await apiRequest(method, endpoint, session);
        const apiResponse = await res.json();
        
        // If API succeeded, also save to Firestore
        if (user) {
          await firestore.saveSharedRecommendation(
            user.id,
            {
              friendIds: session.friends,
              filmIds: session.recommendedFilms,
              context: session.context
            },
            sessionId || apiResponse.id
          );
        }
        
        return apiResponse;
      } catch (error) {
        console.error("Error saving recommendation session:", error);
        showErrorToast(error as Error, "Failed to Save Shared Recommendations");
        
        // Check if it's a network error and try saving locally
        if ((error as Error).message.includes('network') || (error as Error).message.includes('fetch')) {
          setIsOffline(true);
          if (user) {
            const result = await firestore.saveSharedRecommendation(
              user.id,
              {
                friendIds: session.friends,
                filmIds: session.recommendedFilms,
                context: session.context
              },
              sessionId
            );
            
            if (result) {
              toast({
                title: "Saved Offline",
                description: "Shared recommendations saved locally and will sync when you're back online",
              });
              return { 
                success: true, 
                offline: true,
                id: result
              };
            }
          }
        }
        
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [apiSessionsEndpoint] });
      
      toast({
        title: variables.sessionId ? "Session Updated" : "Session Created",
        description: `Shared recommendations have been ${variables.sessionId ? 'updated' : 'saved'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save shared recommendations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load sessions from Firestore
  const loadSessionsFromFirestore = async (): Promise<SharedRecommendationSession[]> => {
    if (!user) return [];
    
    try {
      const firestoreSessions = await firestore.getSharedRecommendations(user.id);
      
      // Convert to SharedRecommendationSession format
      const sessions = firestoreSessions.map(item => ({
        id: item.id || '',
        friends: item.friends || [],
        recommendedFilms: item.recommendedFilms || [],
        createdAt: item.createdAt || new Date().toISOString(),
        context: item.context || {}
      }));
      
      // Log success
      console.log(`Loaded ${sessions.length} shared recommendation sessions from Firestore`);
      
      return sessions;
    } catch (error) {
      showErrorToast(error as Error, "Failed to Load Shared Recommendations from Firestore");
      return [];
    }
  };

  // Sync sessions between API and Firestore (for offline recovery)
  const syncSessions = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get sessions from API and Firestore
      const apiSessions = sessionsData?.sessions || [];
      const firestoreSessions = await loadSessionsFromFirestore();
      
      // Check for differences - sessions in Firestore that aren't in API
      const apiSessionIds = new Set(apiSessions.map(session => session.id));
      const sessionsToSync = firestoreSessions.filter(session => !apiSessionIds.has(session.id));
      
      if (sessionsToSync.length > 0) {
        console.log(`Syncing ${sessionsToSync.length} shared recommendation sessions from Firestore to API...`);
        
        // Sync each session
        for (const session of sessionsToSync) {
          await saveSessionMutation.mutateAsync({
            session: {
              friends: session.friends,
              recommendedFilms: session.recommendedFilms,
              context: session.context,
              filmDetails: session.filmDetails,
              friendNames: session.friendNames
            },
            sessionId: session.id
          });
        }
        
        toast({
          title: "Sessions Synced",
          description: `${sessionsToSync.length} offline recommendation sessions have been synced`,
        });
        
        return true;
      }
      
      return true;
    } catch (error) {
      console.error("Error syncing shared recommendation sessions:", error);
      showErrorToast(error as Error, "Failed to Sync Shared Recommendations");
      return false;
    }
  };

  return {
    // Data
    sessions: sessionsData?.sessions || [],
    isLoadingSessions,
    refetchSessions,
    sessionsError,
    isOffline,
    
    // Mutations
    saveSession: saveSessionMutation.mutate,
    
    // Mutation states
    isSavingSession: saveSessionMutation.isPending,
    
    // Helpers
    loadSessionsFromFirestore,
    syncSessions,
    
    // Firestore access
    firestore,
  };
}