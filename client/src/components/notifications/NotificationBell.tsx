import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem = ({ notification, onMarkAsRead }: { 
  notification: any, 
  onMarkAsRead: () => void 
}) => {
  return (
    <div className={`p-3 ${notification.read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-100 transition-colors`}>
      <div className="flex items-start justify-between">
        <p className="text-sm">{notification.message}</p>
        {!notification.read && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2 h-6 px-2 text-xs"
            onClick={onMarkAsRead}
          >
            Mark as read
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
      </p>
    </div>
  );
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllAsRead 
  } = useNotifications();

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAllAsRead();
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsRead(notificationId);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Marking...
                </>
              ) : (
                'Mark all as read'
              )}
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center p-4 text-gray-500 text-sm">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <NotificationItem 
                  notification={notification} 
                  onMarkAsRead={() => handleMarkAsRead(notification.id)} 
                />
                <Separator />
              </React.Fragment>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};