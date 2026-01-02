/**
 * API Client for Project Manager SaaS
 * Handles all API communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiError {
  error: string;
  message?: string;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'An error occurred',
      }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async signUp(email: string, password: string, name: string, tenantName?: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, tenantName }),
    });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    return data;
  }

  async signIn(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    return data;
  }

  async signOut() {
    try {
      await this.request('/auth/signout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  // Project endpoints
  async getProjects() {
    return this.request<any[]>('/projects');
  }

  async getProject(id: string) {
    return this.request<any>(`/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string; color?: string; status?: string }) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<{ name: string; description: string; color: string; status: string }>) {
    return this.request<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getProjectTasks(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/tasks`);
  }

  // Task endpoints
  async createTask(data: {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
    tags?: string[];
  }) {
    return this.request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string;
    dueDate: string;
    tags: string[];
  }>) {
    return this.request<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async getTask(id: string) {
    return this.request<any>(`/tasks/${id}`);
  }

  // Invitation endpoints
  async createInvitation(projectId: string, email: string, role?: string) {
    return this.request<any>('/invitations', {
      method: 'POST',
      body: JSON.stringify({ projectId, email, role }),
    });
  }

  async getInvitation(token: string) {
    return this.request<any>(`/invitations/${token}`);
  }

  async acceptInvitation(token: string) {
    return this.request<{ message: string }>(`/invitations/${token}/accept`, {
      method: 'POST',
    });
  }

  // Attachment endpoints
  async getTaskAttachments(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/attachments`);
  }

  async uploadTaskAttachment(taskId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const url = `${API_BASE_URL}/tasks/${taskId}/attachments`;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Upload failed',
      }));
      throw new Error(error.error || error.message || 'Upload failed');
    }

    return response.json();
  }

  async deleteAttachment(attachmentId: string) {
    return this.request<{ message: string }>(`/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  getAttachmentUrl(filePath: string): string {
    // If it's already a full URL, return as is
    if (filePath.startsWith('http')) {
      return filePath;
    }
    // Otherwise, construct API URL
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    return `${baseUrl}${filePath}`;
  }

  // Comment endpoints
  async getTaskComments(taskId: string) {
    return this.request<any[]>(`/tasks/${taskId}/comments`);
  }

  async createTaskComment(taskId: string, content: string) {
    return this.request<any>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(commentId: string) {
    return this.request<{ message: string }>(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Activity endpoints
  async getProjectActivities(projectId: string) {
    return this.request<any[]>(`/projects/${projectId}/activities`);
  }

  // Join request endpoints
  async searchProjectByCode(code: string) {
    return this.request<{
      id: string;
      name: string;
      description?: string;
      code: string;
      status: string;
      color: string;
      createdAt: string;
      creator: {
        id: string;
        name: string;
        email: string;
      };
      isMember: boolean;
      hasPendingRequest: boolean;
    }>(`/join-requests/search/${code}`);
  }

  async createJoinRequest(projectCode: string, message?: string) {
    return this.request<{
      id: string;
      projectId: string;
      userId: string;
      status: string;
      message?: string;
      createdAt: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      };
      project: {
        id: string;
        name: string;
        code: string;
      };
    }>('/join-requests', {
      method: 'POST',
      body: JSON.stringify({ projectCode, message }),
    });
  }

  async getProjectJoinRequests(projectId: string) {
    return this.request<Array<{
      id: string;
      projectId: string;
      userId: string;
      status: string;
      message?: string;
      createdAt: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      };
    }>>(`/join-requests/project/${projectId}`);
  }

  async acceptJoinRequest(requestId: string) {
    return this.request<{ message: string }>(`/join-requests/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async declineJoinRequest(requestId: string) {
    return this.request<{ message: string }>(`/join-requests/${requestId}/decline`, {
      method: 'POST',
    });
  }

  // Notification endpoints
  async getNotifications() {
    return this.request<Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      projectId?: string;
      read: boolean;
      createdAt: string;
      project?: {
        id: string;
        name: string;
        code: string;
        color: string;
      };
    }>>('/notifications');
  }

  async getUnreadNotificationCount() {
    return this.request<{ count: number }>('/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<{ message: string }>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'PUT',
    });
  }
}

export const apiClient = new ApiClient();

