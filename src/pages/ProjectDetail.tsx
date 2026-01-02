import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TeamMemberList } from '@/components/projects/TeamMemberList';
import { InviteMemberDialog } from '@/components/projects/InviteMemberDialog';
import { JoinRequestsDialog } from '@/components/projects/JoinRequestsDialog';
import { ProjectCodeDialog } from '@/components/projects/ProjectCodeDialog';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  MoreVertical, 
  Settings, 
  Trash2,
  Users,
  LayoutGrid,
  Loader2,
  Activity,
  UserPlus,
  Copy,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

const statusConfig = {
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  'on-hold': { label: 'On Hold', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { label: 'Completed', className: 'bg-info/10 text-info border-info/20' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-muted' },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, deleteProject, loading, refetchProjects } = useProjects();
  const { user } = useAuth();
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [projectFromApi, setProjectFromApi] = useState<any>(null);
  const [fetchingProject, setFetchingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Reset state when project ID changes
  useEffect(() => {
    setProjectFromApi(null);
    setProjectError(null);
    setFetchingProject(false);
  }, [id]);

  // Try to find project in context first
  let project = projects.find((p) => p.id === id);

  // If not in context and we have an ID, try fetching directly from API
  useEffect(() => {
    const projectInContext = projects.find((p) => p.id === id);
    if (!projectInContext && id && !fetchingProject && !projectFromApi && !projectError) {
      setFetchingProject(true);
      apiClient.getProject(id)
        .then((data) => {
          console.log('[ProjectDetail] Fetched project from API:', data);
          // Transform the API response to match the expected format
          const transformedProject = {
            ...data,
            members: (data.members || []).map((member: any) => ({
              ...member,
              profile: member.user || null
            })),
            tasks: (data.tasks || []).map((task: any) => ({
              ...task,
              status: task.status?.toUpperCase() || task.status,
              priority: task.priority?.toUpperCase() || task.priority,
              tags: Array.isArray(task.tags) 
                ? task.tags 
                : (typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : []),
              dueDate: task.dueDate || task.due_date,
              due_date: task.dueDate || task.due_date,
            })),
          };
          setProjectFromApi(transformedProject);
          // Also refresh projects list to include this project
          refetchProjects();
        })
        .catch((error: any) => {
          console.error('[ProjectDetail] Error fetching project:', error);
          if (error.message?.includes('403') || error.message?.includes('access')) {
            setProjectError('You do not have access to this project');
          } else if (error.message?.includes('404') || error.message?.includes('not found')) {
            setProjectError('Project not found');
          } else {
            setProjectError('Failed to load project');
          }
        })
        .finally(() => {
          setFetchingProject(false);
        });
    }
  }, [id, projects, fetchingProject, projectFromApi, projectError, refetchProjects]);

  // Use project from API if not in context
  if (!project && projectFromApi) {
    project = projectFromApi;
  }

  if (loading || fetchingProject) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {projectError || 'Project not found'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {projectError === 'You do not have access to this project'
              ? 'You need to be a member of this project to view it.'
              : 'The project you\'re looking for doesn\'t exist.'}
          </p>
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.active;

  const currentUserMember = project.members?.find((m: any) => m.user?.id === user?.id || m.userId === user?.id);
  const isOwner = currentUserMember?.role === 'OWNER' || currentUserMember?.role === 'owner';
  const isAdmin = isOwner || currentUserMember?.role === 'ADMIN' || currentUserMember?.role === 'admin';

  const handleDelete = async () => {
    await deleteProject(project.id);
    navigate('/projects');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <Badge variant="outline" className={cn(status.className)}>
                  {status.label}
                </Badge>
                {project.code && (
                  <Badge variant="outline" className="font-mono">
                    Code: {project.code}
                  </Badge>
                )}
              </div>
              {project.description && (
                <p className="text-muted-foreground mt-1 ml-7">{project.description}</p>
              )}
              {project.code && (
                <div className="flex items-center gap-2 mt-2 ml-7">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCodeDialogOpen(true)}
                    className="h-7 text-xs"
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Share Project Code
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setJoinRequestsOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join Requests
              </Button>
            )}
            <InviteMemberDialog projectId={project.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.code && (
                  <>
                    <DropdownMenuItem onClick={() => setCodeDialogOpen(true)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Project Code
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Project Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team ({project.members.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <TaskBoard project={project} />
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="max-w-3xl">
              <TeamMemberList project={project} />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="max-w-2xl bg-card rounded-lg border border-border p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
              <ActivityFeed projectId={project.id} />
            </div>
          </TabsContent>
        </Tabs>

        {isAdmin && (
          <JoinRequestsDialog
            open={joinRequestsOpen}
            onOpenChange={setJoinRequestsOpen}
            projectId={project.id}
            onRequestProcessed={() => {
              refetchProjects();
            }}
          />
        )}

        {project.code && (
          <ProjectCodeDialog
            open={codeDialogOpen}
            onOpenChange={setCodeDialogOpen}
            projectCode={project.code}
            projectName={project.name}
          />
        )}
      </div>
    </AppLayout>
  );
}
