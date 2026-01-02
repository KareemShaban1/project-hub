import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectWithDetails } from '@/contexts/ProjectContext';

interface ProjectCardProps {
  project: ProjectWithDetails;
}

const statusConfig = {
  ACTIVE: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  ON_HOLD: { label: 'On Hold', className: 'bg-warning/10 text-warning border-warning/20' },
  COMPLETED: { label: 'Completed', className: 'bg-info/10 text-info border-info/20' },
  ARCHIVED: { label: 'Archived', className: 'bg-muted text-muted-foreground border-muted' },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.ACTIVE;
  // API returns uppercase status (DONE), handle both for compatibility
  const completedTasks = project.tasks?.filter(t => 
    t.status === 'DONE' || t.status === 'done'
  ).length || 0;
  const totalTasks = project.tasks?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Link to={`/project/${project.id}`}>
      <div className="group relative bg-card rounded-xl border border-border p-5 hover:border-primary/50 hover:shadow-card transition-all duration-300 animate-fade-in">
        {/* Color accent */}
        <div 
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl opacity-80"
          style={{ backgroundColor: project.color }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pt-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {project.name}
              </h3>
              {project.code && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {project.code}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description || 'No description'}
            </p>
          </div>
          <Badge variant="outline" className={cn("ml-2 shrink-0", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Progress */}
        {totalTasks > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progress</span>
              <span>{completedTasks}/{totalTasks} tasks</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: project.color 
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {/* Members */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {project.members?.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="w-7 h-7 border-2 border-card">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {member.user?.name?.split(' ').map(n => n[0]).join('') || member.profile?.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {(project.members?.length || 0) > 3 && (
                <div className="w-7 h-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-xs text-muted-foreground">
                  +{(project.members?.length || 0) - 3}
                </div>
              )}
            </div>
            <span className="ml-2 text-xs text-muted-foreground">
              {project.members?.length || 0} member{(project.members?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {new Date(project.updatedAt || project.updated_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}
