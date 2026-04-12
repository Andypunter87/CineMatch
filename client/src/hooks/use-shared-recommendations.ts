import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useErrorToast } from "@/lib/error-utils";
import { Film } from "@shared/schema";

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
    [key: string]: string | undefined;
  };
  filmDetails?: Film[];
  friendNames?: string[];
}

export function useSharedRecommendations() {
  const { toast } = useToast();
  const { showErrorToast } = useErrorToast();
  const { user } = useAuth();

  const apiSessionsEndpoint = '/api/shared-recommendations';
  const apiCreateSessionEndpoint = '/api/shared-recommendations/create';
  const apiUpdateSessionEndpoint = '/api/shared-recommendations/update';

  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
    error: sessionsError,
  } = useQuery<{ sessions: SharedRecommendationSession[] }>({
    queryKey: [apiSessionsEndpoint],
    queryFn: getQueryFn({
      on401: "returnNull",
      onError: (error) => {
        showErrorToast(error, "Failed to Load Shared Recommendations");
      },
    }),
    retry: 1,
    enabled: !!user,
  });

  const saveSessionMutation = useMutation({
    mutationFn: async ({
      session,
      sessionId,
    }: {
      session: Omit<SharedRecommendationSession, 'id' | 'createdAt'>;
      sessionId?: string;
    }) => {
      if (sessionId) {
        const res = await apiRequest('PUT', `${apiUpdateSessionEndpoint}/${sessionId}`, session);
        return res.json();
      } else {
        const res = await apiRequest('POST', apiCreateSessionEndpoint, session);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiSessionsEndpoint] });
      toast({
        title: "Session Saved",
        description: "Shared recommendation session has been saved",
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Save Session");
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest('DELETE', `${apiSessionsEndpoint}/${sessionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiSessionsEndpoint] });
      toast({
        title: "Session Deleted",
        description: "Shared recommendation session has been deleted",
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to Delete Session");
    },
  });

  const getSessionById = (sessionId: string): SharedRecommendationSession | undefined => {
    return sessionsData?.sessions.find((session) => session.id === sessionId);
  };

  return {
    sessions: sessionsData?.sessions || [],
    isLoadingSessions,
    refetchSessions,
    sessionsError,

    saveSession: saveSessionMutation.mutate,
    deleteSession: deleteSessionMutation.mutate,

    isSavingSession: saveSessionMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending,

    getSessionById,
  };
}
