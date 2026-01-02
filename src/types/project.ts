export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'archived';

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  user: User;
  role: ProjectRole;
  joinedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: ProjectRole;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: User;
  invitedAt: Date;
  expiresAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: ProjectMember;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  members: ProjectMember[];
  invitations: Invitation[];
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
  color: string;
}
