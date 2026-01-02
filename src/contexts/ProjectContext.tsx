import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Type definitions matching API response
export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

interface Profile {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMember {
  id: string;
  tenantId: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user?: Profile;
}

interface Invitation {
  id: string;
  tenantId: string;
  projectId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedBy?: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  inviter?: Profile | null;
  project?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: Profile;
  creator?: Profile;
  _count?: {
    comments: number;
    attachments: number;
  };
}

interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  code?: string;
  status: ProjectStatus;
  color: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  creator?: Profile;
  members?: ProjectMember[];
  invitations?: Invitation[];
  tasks?: Task[];
  _count?: {
    tasks: number;
    members: number;
  };
}

interface ProjectWithDetails extends Project {
  members: (ProjectMember & { user: Profile })[];
  invitations: Invitation[];
  tasks: Task[];
}

interface PendingInvitation extends Invitation {
  project: Project;
  inviter: Profile | null;
}

interface ProjectContextType {
  projects: ProjectWithDetails[];
  profiles: Map<string, Profile>;
  loading: boolean;
  currentUserProfile: Profile | null;
  pendingInvitations: PendingInvitation[];
  createProject: (name: string, description?: string) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  inviteMember: (projectId: string, email: string, role: ProjectRole) => Promise<any>;
  cancelInvitation: (projectId: string, invitationId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  updateMemberRole: (projectId: string, memberId: string, role: ProjectRole) => Promise<void>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;
  createTask: (projectId: string, task: { title: string; description?: string; status: TaskStatus; priority: TaskPriority; tags: string[]; due_date?: string }) => Promise<void>;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  refetchProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setPendingInvitations([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch all projects (API returns projects with members, invitations, and tasks)
      const projectsData = await apiClient.getProjects();

      // Build profiles map from project data
      const profilesMap = new Map<string, Profile>();
      
      projectsData.forEach((project: any) => {
        // Add creator to profiles
        if (project.creator) {
          profilesMap.set(project.creator.id, project.creator);
        }
        
        // Add members' profiles
        project.members?.forEach((member: any) => {
          if (member.user) {
            profilesMap.set(member.user.id, member.user);
          }
        });
        
        // Add invitation inviters
        project.invitations?.forEach((invitation: any) => {
          if (invitation.inviter) {
            profilesMap.set(invitation.inviter.id, invitation.inviter);
          }
        });
        
        // Add task assignees and creators
        project.tasks?.forEach((task: any) => {
          if (task.assignee) {
            profilesMap.set(task.assignee.id, task.assignee);
          }
          if (task.creator) {
            profilesMap.set(task.creator.id, task.creator);
          }
        });
      });

      setProfiles(profilesMap);

      // Set current user profile
      const userProfile = user.profile ? {
        id: user.profile.id,
        tenantId: user.tenantId,
        email: user.profile.email,
        name: user.profile.name,
        avatarUrl: user.profile.avatarUrl,
        createdAt: '',
        updatedAt: ''
      } : null;
      setCurrentUserProfile(userProfile);

      // Find pending invitations for current user
      if (userProfile) {
        const userPendingInvitations: PendingInvitation[] = [];
        projectsData.forEach((project: any) => {
          project.invitations?.forEach((invitation: any) => {
            if (
              invitation.email.toLowerCase() === userProfile.email.toLowerCase() &&
              invitation.status === 'PENDING'
            ) {
              userPendingInvitations.push({
                ...invitation,
                project: {
                  id: project.id,
                  name: project.name,
                  description: project.description
                },
                inviter: invitation.inviter || null
              });
            }
          });
        });
        setPendingInvitations(userPendingInvitations);
      }

      console.log(`[ProjectContext] Fetched ${projectsData.length} projects`);
      
      // Transform API response to match expected format
      const projectsWithDetails: ProjectWithDetails[] = projectsData.map((project: any) => {
        // Ensure tasks array exists and transform task data
        const tasks = (project.tasks || []).map((task: any) => ({
          ...task,
          // Ensure status is uppercase for consistency
          status: task.status?.toUpperCase() || task.status,
          // Ensure priority is uppercase
          priority: task.priority?.toUpperCase() || task.priority,
          // Handle tags - could be JSON string or array
          tags: Array.isArray(task.tags) 
            ? task.tags 
            : (typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : []),
          // Map dueDate field
          dueDate: task.dueDate || task.due_date,
          due_date: task.dueDate || task.due_date,
        }));

        return {
          ...project,
          members: (project.members || []).map((member: any) => ({
            ...member,
            profile: member.user || null
          })),
          invitations: project.invitations || [],
          tasks: tasks,
        };
      });

      // Debug: Log first project's tasks
      if (projectsWithDetails.length > 0) {
        console.log('First project tasks:', projectsWithDetails[0].tasks);
        console.log('First project:', projectsWithDetails[0].name);
      }

      setProjects(projectsWithDetails);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchProjects();
      
      // Poll for project updates every 60 seconds
      // This ensures users see new projects they've been added to (e.g., via join request acceptance)
      const interval = setInterval(() => {
        fetchProjects();
      }, 60000); // 60 seconds

      return () => clearInterval(interval);
    }
  }, [user, fetchProjects]);

  // TODO: Add polling or WebSocket for real-time updates
  // Real-time subscriptions removed - can be added later with WebSocket

  const createProject = async (name: string, description?: string) => {
    if (!user) return;

    const colors = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    try {
      await apiClient.createProject({ name, description, color });
      toast.success('Project created successfully');
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
      console.error(error);
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      await apiClient.updateProject(projectId, updates);
      toast.success('Project updated');
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update project');
      console.error(error);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await apiClient.deleteProject(projectId);
      toast.success('Project deleted');
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project');
      console.error(error);
    }
  };

  const inviteMember = async (projectId: string, email: string, role: ProjectRole) => {
    if (!user) return;

    try {
      // Convert role format (API uses uppercase)
      // Frontend uses lowercase: 'owner', 'admin', 'member', 'viewer'
      // API expects uppercase: 'ADMIN', 'MEMBER', 'VIEWER'
      let apiRole: string;
      if (role === 'owner' || role === 'OWNER') {
        apiRole = 'ADMIN'; // Map owner to admin for invitations
      } else {
        // Convert to uppercase
        apiRole = role.toUpperCase() as 'ADMIN' | 'MEMBER' | 'VIEWER';
      }
      
      const invitation = await apiClient.createInvitation(projectId, email, apiRole);
      toast.success(`Invitation sent to ${email}`);
      await fetchProjects();
      return invitation; // Return invitation with token
    } catch (error: any) {
      if (error.message.includes('already')) {
        toast.error('This email has already been invited');
      } else {
        toast.error(error.message || 'Failed to send invitation');
      }
      console.error(error);
      throw error;
    }
  };

  const cancelInvitation = async (projectId: string, invitationId: string) => {
    // TODO: Add cancel invitation endpoint to API
    toast.error('Cancel invitation not yet implemented in API');
    // For now, just refetch
    await fetchProjects();
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      // Find invitation token from pending invitations
      const invitation = pendingInvitations.find(i => i.id === invitationId);
      if (!invitation) {
        toast.error('Invitation not found');
        return;
      }

      await apiClient.acceptInvitation(invitation.token);
      toast.success('Successfully joined the project!');
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept invitation');
      console.error(error);
    }
  };

  const declineInvitation = async (invitationId: string) => {
    // TODO: Add decline invitation endpoint to API
    toast.error('Decline invitation not yet implemented in API');
    await fetchProjects();
  };

  const updateMemberRole = async (projectId: string, memberId: string, role: ProjectRole) => {
    // TODO: Add update member role endpoint to API
    toast.error('Update member role not yet implemented in API');
    await fetchProjects();
  };

  const removeMember = async (projectId: string, memberId: string) => {
    // TODO: Add remove member endpoint to API
    toast.error('Remove member not yet implemented in API');
    await fetchProjects();
  };

  const createTask = async (projectId: string, task: { title: string; description?: string; status: TaskStatus; priority: TaskPriority; tags: string[]; due_date?: string }) => {
    if (!user) return;

    try {
      // Convert status and priority to uppercase for API
      await apiClient.createTask({
        projectId,
        title: task.title,
        description: task.description,
        status: task.status.toUpperCase() as any,
        priority: task.priority.toUpperCase() as any,
        tags: task.tags,
        dueDate: task.due_date
      });
      toast.success('Task created');
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
      console.error(error);
    }
  };

  const updateTask = async (projectId: string, taskId: string, updates: Partial<Task>) => {
    try {
      // Convert status and priority if present
      const apiUpdates: any = { ...updates };
      if (updates.status) {
        apiUpdates.status = updates.status.toUpperCase();
      }
      if (updates.priority) {
        apiUpdates.priority = updates.priority.toUpperCase();
      }
      
      await apiClient.updateTask(taskId, apiUpdates);
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
      console.error(error);
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    try {
      await apiClient.deleteTask(taskId);
      toast.success('Task deleted');
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task');
      console.error(error);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      profiles,
      loading,
      currentUserProfile,
      pendingInvitations,
      createProject,
      updateProject,
      deleteProject,
      inviteMember,
      cancelInvitation,
      acceptInvitation,
      declineInvitation,
      updateMemberRole,
      removeMember,
      createTask,
      updateTask,
      deleteTask,
      refetchProjects: fetchProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
