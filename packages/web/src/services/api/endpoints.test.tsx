/**
 * API Endpoints Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiEndpoints, createApiEndpoints } from './endpoints';
import { ApiClient } from './client';

describe('ApiEndpoints', () => {
  let endpoints: ApiEndpoints;
  let mockClient: ApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create mock client
    mockClient = new ApiClient({
      baseURL: 'https://api.example.com',
    });

    // Spy on client methods
    vi.spyOn(mockClient, 'get').mockResolvedValue({ success: true, data: {} });
    vi.spyOn(mockClient, 'post').mockResolvedValue({ success: true, data: {} });
    vi.spyOn(mockClient, 'put').mockResolvedValue({ success: true, data: {} });
    vi.spyOn(mockClient, 'patch').mockResolvedValue({ success: true, data: {} });
    vi.spyOn(mockClient, 'delete').mockResolvedValue({ success: true, data: {} });

    // Create endpoints instance
    endpoints = new ApiEndpoints(mockClient);
  });

  describe('Auth Endpoints', () => {
    it('should login user', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };

      await endpoints.login(credentials);

      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/login', credentials);
    });

    it('should register user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      };

      await endpoints.register(credentials);

      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/register', credentials);
    });

    it('should logout user', async () => {
      await endpoints.logout();

      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/logout');
    });

    it('should get current user', async () => {
      await endpoints.me();

      expect(mockClient.get).toHaveBeenCalledWith('/api/auth/me');
    });
  });

  describe('Workspace Endpoints', () => {
    it('should get all workspaces', async () => {
      await endpoints.getWorkspaces();

      expect(mockClient.get).toHaveBeenCalledWith('/api/workspaces');
    });

    it('should get workspace by id', async () => {
      await endpoints.getWorkspace('workspace-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/workspaces/workspace-1');
    });

    it('should create workspace', async () => {
      const data = {
        userId: 'user-1',
        name: 'My Workspace',
      };

      await endpoints.createWorkspace(data);

      expect(mockClient.post).toHaveBeenCalledWith('/api/workspaces', data);
    });

    it('should update workspace', async () => {
      const data = { name: 'Updated Workspace' };

      await endpoints.updateWorkspace('workspace-1', data);

      expect(mockClient.put).toHaveBeenCalledWith('/api/workspaces/workspace-1', data);
    });

    it('should delete workspace', async () => {
      await endpoints.deleteWorkspace('workspace-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/workspaces/workspace-1');
    });
  });

  describe('Project Endpoints', () => {
    it('should get all projects', async () => {
      await endpoints.getProjects();

      expect(mockClient.get).toHaveBeenCalledWith('/api/projects', { params: undefined });
    });

    it('should get projects by workspace', async () => {
      await endpoints.getProjects('workspace-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/projects', {
        params: { workspaceId: 'workspace-1' },
      });
    });

    it('should get project by id', async () => {
      await endpoints.getProject('project-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/projects/project-1');
    });

    it('should create project', async () => {
      const data = {
        workspaceId: 'workspace-1',
        name: 'My Project',
        path: '/path/to/project',
      };

      await endpoints.createProject(data);

      expect(mockClient.post).toHaveBeenCalledWith('/api/projects', data);
    });

    it('should update project', async () => {
      const data = { name: 'Updated Project' };

      await endpoints.updateProject('project-1', data);

      expect(mockClient.patch).toHaveBeenCalledWith('/api/projects/project-1', data);
    });

    it('should delete project', async () => {
      await endpoints.deleteProject('project-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/projects/project-1');
    });
  });

  describe('Session Endpoints', () => {
    it('should get sessions by project', async () => {
      await endpoints.getSessions('project-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/sessions', {
        params: { projectId: 'project-1' },
      });
    });

    it('should get session by id', async () => {
      await endpoints.getSession('session-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/sessions/session-1');
    });

    it('should create session', async () => {
      const data = {
        projectId: 'project-1',
        agentType: 'claude-opus-4-5-20251101' as const,
      };

      await endpoints.createSession(data);

      expect(mockClient.post).toHaveBeenCalledWith('/api/sessions', data);
    });

    it('should update session', async () => {
      const data = { title: 'Updated Session' };

      await endpoints.updateSession('session-1', data);

      expect(mockClient.patch).toHaveBeenCalledWith('/api/sessions/session-1', data);
    });

    it('should delete session', async () => {
      await endpoints.deleteSession('session-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/sessions/session-1');
    });
  });

  describe('Factory Function', () => {
    it('should create endpoints instance', () => {
      const instance = createApiEndpoints(mockClient);

      expect(instance).toBeInstanceOf(ApiEndpoints);
    });
  });
});
