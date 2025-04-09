import { useQuery, useMutation } from '@tanstack/react-query';
import { Notification } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function useNotifications() {
  const {
    data: notifications = [],
    error,
    isLoading,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    staleTime: 60000, // 1 minute
  });

  const unreadCountQuery = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    staleTime: 60000, // 1 minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest(
        'PATCH',
        `/api/notifications/${notificationId}`
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate both notifications and count queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        '/api/notifications/mark-all-read'
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate both notifications and count queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  return {
    notifications,
    unreadCount: unreadCountQuery.data?.count || 0,
    isLoading: isLoading || unreadCountQuery.isLoading,
    error: error || unreadCountQuery.error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}