import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import { useProjects } from '@/contexts/ProjectContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle2, PlusCircle, Edit3, Trash2, UserPlus, MessageSquare, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface ActivityLog {
  id: string;
  tenantId: string;
  projectId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: any;
  createdAt: string;
  user?: ActivityUser | null;
}

interface ActivityFeedProps {
  projectId: string;
}

const actionIcons: Record<string, typeof CheckCircle2> = {
  'created': PlusCircle,
  'updated': Edit3,
  'deleted': Trash2,
  'completed': CheckCircle2,
  'joined': UserPlus,
  'commented': MessageSquare,
  'attached': Paperclip,
};

const actionColors: Record<string, string> = {
  'created': 'text-success',
  'updated': 'text-info',
  'deleted': 'text-destructive',
  'completed': 'text-success',
  'joined': 'text-primary',
  'commented': 'text-warning',
  'attached': 'text-info',
};

export function ActivityFeed({ projectId }: ActivityFeedProps) {
  const { profiles } = useProjects();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProjectActivities(projectId);
      setActivities(data);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // TODO: Add polling or WebSocket for real-time updates
  }, [projectId]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActionMessage = (activity: ActivityLog): string => {
    const entityName = activity.entityName || activity.entityType;
    switch (activity.action) {
      case 'created':
        return `created ${activity.entityType} "${entityName}"`;
      case 'updated':
        return `updated ${activity.entityType} "${entityName}"`;
      case 'deleted':
        return `deleted ${activity.entityType} "${entityName}"`;
      case 'completed':
        return `completed ${activity.entityType} "${entityName}"`;
      case 'joined':
        return `joined the project`;
      case 'commented':
        return `commented on "${entityName}"`;
      case 'attached':
        return `attached a file to "${entityName}"`;
      default:
        return `${activity.action} ${entityName}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => {
        const Icon = actionIcons[activity.action] || Edit3;
        const iconColor = actionColors[activity.action] || 'text-muted-foreground';
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-3 py-3">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-12 w-px h-[calc(100%-24px)] bg-border" />
            )}
            
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary",
              iconColor
            )}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {activity.user && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={activity.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {getInitials(activity.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {activity.user.name}
                    </span>
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {getActionMessage(activity)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
