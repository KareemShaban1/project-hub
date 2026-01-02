import { useProjects } from '@/contexts/ProjectContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { PendingInvitationsBanner } from '@/components/invitations/PendingInvitationsBanner';
import { 
  FolderKanban, 
  Users, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { projects, currentUserProfile, loading } = useProjects();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = projects.reduce((sum, p) => sum + p.tasks.filter(t => t.status === 'done').length, 0);
  const totalMembers = new Set(projects.flatMap(p => p.members.map(m => m.user_id))).size;
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const stats = [
    { 
      label: 'Active Projects', 
      value: activeProjects, 
      icon: FolderKanban, 
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    { 
      label: 'Team Members', 
      value: totalMembers, 
      icon: Users, 
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    { 
      label: 'Tasks Completed', 
      value: completedTasks, 
      icon: CheckCircle2, 
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    { 
      label: 'Pending Tasks', 
      value: totalTasks - completedTasks, 
      icon: Clock, 
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
  ];

  const firstName = currentUserProfile?.name?.split(' ')[0] || 'there';

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Pending Invitations */}
        <PendingInvitationsBanner />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your projects today.
            </p>
          </div>
          <CreateProjectDialog />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-card transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Projects</h2>
            <Link 
              to="/projects" 
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((project, index) => (
                <div key={project.id} style={{ animationDelay: `${index * 0.05}s` }}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <CreateProjectDialog />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
