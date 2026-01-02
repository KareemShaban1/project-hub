import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api-client';
import { useProjects } from '@/contexts/ProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { refetchProjects } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const previousNotifications = notifications;
      const data = await apiClient.getNotifications();
      
      // Check if there are new unread project-related notifications
      const previousUnreadProjectNotifs = previousNotifications.filter(
        (n: any) => !n.read && (n.type === 'PROJECT_UPDATE' || n.type === 'JOIN_REQUEST')
      );
      const currentUnreadProjectNotifs = data.filter(
        (n: any) => !n.read && (n.type === 'PROJECT_UPDATE' || n.type === 'JOIN_REQUEST')
      );
      
      // If new project notifications detected, refresh projects
      if (currentUnreadProjectNotifs.length > previousUnreadProjectNotifs.length) {
        console.log('[NotificationDropdown] New project notification detected, refreshing projects...');
        await refetchProjects();
      }
      
      // Also check if any notification mentions "accepted" - this might be a join request acceptance
      const hasNewAcceptanceNotification = data.some((n: any) => {
        const isNew = !previousNotifications.find((p: any) => p.id === n.id);
        const mentionsAccepted = n.title?.toLowerCase().includes('accepted') || 
                                 n.message?.toLowerCase().includes('accepted');
        return isNew && !n.read && mentionsAccepted && (n.type === 'PROJECT_UPDATE' || n.type === 'JOIN_REQUEST');
      });
      
      if (hasNewAcceptanceNotification) {
        console.log('[NotificationDropdown] Join request acceptance detected, refreshing projects...');
        await refetchProjects();
      }
      
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { count } = await apiClient.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read
      if (!notification.read) {
        await apiClient.markNotificationAsRead(notification.id);
      }
      
      // Refresh projects if it's a project-related notification
      // IMPORTANT: Wait for projects to refresh before navigating
      if (notification.type === 'PROJECT_UPDATE' || notification.type === 'JOIN_REQUEST') {
        console.log('[NotificationDropdown] Refreshing projects before navigation...');
        await refetchProjects();
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Navigate to project if it has a projectId
      if (notification.projectId) {
        console.log(`[NotificationDropdown] Navigating to project ${notification.projectId}`);
        navigate(`/project/${notification.projectId}`);
      }
      
      // Reload notifications
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      // When dropdown opens, refresh notifications and check for new project notifications
      const data = await apiClient.getNotifications();
      await loadUnreadCount();
      
      // Check if there are any unread project-related notifications
      const hasProjectNotifications = data.some(
        (n: any) => (n.type === 'PROJECT_UPDATE' || n.type === 'JOIN_REQUEST') && !n.read
      );
      
      if (hasProjectNotifications) {
        console.log('[NotificationDropdown] Opening dropdown with project notifications, refreshing projects...');
        await refetchProjects();
      }
      
      // Update notifications state
      setNotifications(data);
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <>
              {unreadNotifications.length > 0 && (
                <>
                  {unreadNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start p-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        {notification.project && (
                          <div
                            className="w-3 h-3 rounded mt-1 flex-shrink-0"
                            style={{ backgroundColor: notification.project.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{notification.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {readNotifications.length > 0 && <DropdownMenuSeparator />}
                </>
              )}
              {readNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 cursor-pointer opacity-60"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2 w-full">
                    {notification.project && (
                      <div
                        className="w-3 h-3 rounded mt-1 flex-shrink-0"
                        style={{ backgroundColor: notification.project.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

