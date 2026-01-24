/**
 * Typed API Endpoints
 *
 * Typed functions for all backend API endpoints
 */

import { ApiClient } from './client';
import type {
  ApiResponse,
  User,
  Workspace,
  CreateWorkspace,
  UpdateWorkspace,
  Project,
  CreateProject,
  UpdateProject,
  ProjectSummary,
  Session,
  CreateSession,
  UpdateSession,
  SessionSummary,
  Message,
  CreateMessage,
} from '@agistack/shared';

/**
 * Auth API
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export class ApiEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Auth endpoints
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.client.post<LoginResponse>('/api/auth/login', credentials);
  }

  async register(credentials: RegisterCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.client.post<LoginResponse>('/api/auth/register', credentials);
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.client.post<void>('/api/auth/logout');
  }

  async me(): Promise<ApiResponse<User>> {
    return this.client.get<User>('/api/auth/me');
  }

  async verifyToken(): Promise<ApiResponse<{ user: User; valid: boolean }>> {
    return this.client.post<{ user: User; valid: boolean }>('/api/auth/verify');
  }

  /**
   * User endpoints
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.client.get<User>('/api/users/me');
  }

  async updateCurrentUser(data: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<ApiResponse<User>> {
    return this.client.patch<User>('/api/users/me', data);
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.client.put<void>('/api/users/me/password', {
      currentPassword,
      newPassword,
    });
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.client.get<User>(`/api/users/${id}`);
  }

  /**
   * Workspace endpoints
   */
  async getWorkspaces(): Promise<ApiResponse<Workspace[]>> {
    return this.client.get<Workspace[]>('/api/workspaces');
  }

  async getWorkspace(id: string): Promise<ApiResponse<Workspace>> {
    return this.client.get<Workspace>(`/api/workspaces/${id}`);
  }

  async createWorkspace(data: CreateWorkspace): Promise<ApiResponse<Workspace>> {
    return this.client.post<Workspace>('/api/workspaces', data);
  }

  async updateWorkspace(id: string, data: UpdateWorkspace): Promise<ApiResponse<Workspace>> {
    return this.client.put<Workspace>(`/api/workspaces/${id}`, data);
  }

  async deleteWorkspace(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/api/workspaces/${id}`);
  }

  /**
   * Project endpoints
   */
  async getProjects(workspaceId?: string): Promise<ApiResponse<ProjectSummary[]>> {
    const params = workspaceId ? { workspaceId } : undefined;
    return this.client.get<ProjectSummary[]>('/api/projects', { params });
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return this.client.get<Project>(`/api/projects/${id}`);
  }

  async createProject(data: CreateProject): Promise<ApiResponse<Project>> {
    return this.client.post<Project>('/api/projects', data);
  }

  async updateProject(id: string, data: UpdateProject): Promise<ApiResponse<Project>> {
    return this.client.patch<Project>(`/api/projects/${id}`, data);
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/api/projects/${id}`);
  }

  /**
   * Session endpoints
   */
  async getSessions(projectId: string): Promise<ApiResponse<SessionSummary[]>> {
    return this.client.get<SessionSummary[]>('/api/sessions', { params: { projectId } });
  }

  async getSession(id: string): Promise<ApiResponse<Session>> {
    return this.client.get<Session>(`/api/sessions/${id}`);
  }

  async createSession(data: CreateSession): Promise<ApiResponse<Session>> {
    return this.client.post<Session>('/api/sessions', data);
  }

  async updateSession(id: string, data: UpdateSession): Promise<ApiResponse<Session>> {
    return this.client.patch<Session>(`/api/sessions/${id}`, data);
  }

  async deleteSession(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/api/sessions/${id}`);
  }

  /**
   * Message endpoints
   * Note: Messages are typically accessed through sessions,
   * but we provide direct access for flexibility
   */
  async getMessages(sessionId: string): Promise<ApiResponse<Message[]>> {
    return this.client.get<Message[]>(`/api/sessions/${sessionId}/messages`);
  }

  async getMessage(id: string): Promise<ApiResponse<Message>> {
    return this.client.get<Message>(`/api/messages/${id}`);
  }

  async createMessage(sessionId: string, data: CreateMessage): Promise<ApiResponse<Message>> {
    return this.client.post<Message>(`/api/sessions/${sessionId}/messages`, data);
  }

  async updateMessage(id: string, data: Partial<CreateMessage>): Promise<ApiResponse<Message>> {
    return this.client.put<Message>(`/api/messages/${id}`, data);
  }

  async deleteMessage(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/api/messages/${id}`);
  }
}

/**
 * Create API endpoints instance
 */
export function createApiEndpoints(client: ApiClient): ApiEndpoints {
  return new ApiEndpoints(client);
}
