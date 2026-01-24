import { describe, it, expect } from 'vitest';
import { api } from './index';

describe('API Server', () => {

  describe('Health Check', () => {
    it('should return 200 for health check', async () => {
      const response = await api.request('/api/health');
      expect(response.status).toBe(200);
    });

    it('should return health status', async () => {
      const response = await api.request('/api/health');
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('timestamp');
      expect(data.data).toHaveProperty('status', 'healthy');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await api.request('/api/unknown');
      expect(response.status).toBe(404);
    });

    it('should return error message for unknown routes', async () => {
      const response = await api.request('/api/unknown');
      const data = await response.json();

      expect(data).toHaveProperty('error');
    });
  });

  describe('Projects API', () => {
    describe('GET /api/projects', () => {
      it('should return empty array initially', async () => {
        const response = await api.request('/api/projects');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data.projects)).toBe(true);
        expect(data.projects.length).toBe(0);
      });
    });

    describe('POST /api/projects', () => {
      it('should create a new project', async () => {
        const newProject = {
          workspaceId: 'workspace-123',
          name: 'Test Project',
          path: '/tmp/test-project',
          description: 'A test project',
        };

        const response = await api.request('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProject),
        });

        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data.name).toBe(newProject.name);
        expect(data.path).toBe(newProject.path);
      });

      it('should reject invalid project data', async () => {
        const invalidProject = {
          workspaceId: 'workspace-123',
          name: '', // Invalid: empty name
          path: '/tmp/test',
        };

        const response = await api.request('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidProject),
        });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Sessions API', () => {
    describe('POST /api/sessions', () => {
      it('should create a new session', async () => {
        const newSession = {
          projectId: 'project-123',
          agentType: 'build',
          title: 'Build a new feature',
        };

        const response = await api.request('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSession),
        });

        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data.agentType).toBe(newSession.agentType);
      });

      it('should reject invalid agent type', async () => {
        const invalidSession = {
          projectId: 'project-123',
          agentType: 'invalid', // Invalid agent type
        };

        const response = await api.request('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidSession),
        });

        expect(response.status).toBe(400);
      });
    });
  });
});
