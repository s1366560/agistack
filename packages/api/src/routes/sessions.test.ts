import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { sessionsRouter, sessionRepository, messageRepository } from './sessions';

describe('Sessions API', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/sessions', sessionsRouter);

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('GET /api/sessions', () => {
    it('should return list of sessions', async () => {
      const mockSessions = [
        {
          id: 'sess-1',
          projectId: 'proj-1',
          agentType: 'build',
          title: 'Test Session',
          messages: [],
          context: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(sessionRepository, 'findAll').mockResolvedValue(mockSessions);

      const response = await app.request('/api/sessions');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSessions);
    });

    it('should filter by projectId', async () => {
      const mockSessions = [
        {
          id: 'sess-1',
          projectId: 'proj-1',
          agentType: 'build',
          title: 'Test Session',
          messages: [],
          context: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(sessionRepository, 'findByProjectId').mockResolvedValue(mockSessions);

      const response = await app.request('/api/sessions?projectId=proj-1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSessions);
    });

    it('should filter by agentType', async () => {
      const mockSessions = [
        {
          id: 'sess-1',
          projectId: 'proj-1',
          agentType: 'plan',
          title: 'Planning Session',
          messages: [],
          context: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(sessionRepository, 'findByAgentType').mockResolvedValue(mockSessions);

      const response = await app.request('/api/sessions?agentType=plan&projectId=proj-1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSessions);
    });

    it('should handle limit and offset parameters', async () => {
      const mockSessions = [
        {
          id: 'sess-1',
          projectId: 'proj-1',
          agentType: 'build',
          title: 'Test Session',
          messages: [],
          context: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(sessionRepository, 'findAll').mockResolvedValue(mockSessions);

      const response = await app.request('/api/sessions?limit=10&offset=5');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSessions);
    });

    it('should return error on repository failure', async () => {
      vi.spyOn(sessionRepository, 'findAll').mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.request('/api/sessions');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with messages', async () => {
      const mockSession = {
        id: 'sess-1',
        projectId: 'proj-1',
        agentType: 'build',
        title: 'Test Session',
        messages: [],
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockMessages = [
        {
          id: 'msg-1',
          sessionId: 'sess-1',
          role: 'user',
          content: 'Hello',
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      ];

      vi.spyOn(sessionRepository, 'findById').mockResolvedValue(mockSession);
      vi.spyOn(messageRepository, 'findBySessionId').mockResolvedValue(mockMessages);

      const response = await app.request('/api/sessions/sess-1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.session).toEqual(mockSession);
      expect(data.data.messages).toEqual(mockMessages);
    });

    it('should return 404 for non-existent session', async () => {
      vi.spyOn(sessionRepository, 'findById').mockResolvedValue(null);

      const response = await app.request('/api/sessions/non-existent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    it('should return error on repository failure', async () => {
      vi.spyOn(sessionRepository, 'findById').mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.request('/api/sessions/sess-1');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/sessions', () => {
    const validPayload = {
      projectId: 'proj-1',
      agentType: 'build',
      title: 'New Session',
    };

    it('should create a new session', async () => {
      const mockSession = {
        id: 'sess-1',
        ...validPayload,
        messages: [],
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(sessionRepository, 'create').mockResolvedValue(mockSession);

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSession);
    });

    it('should create session without optional title', async () => {
      const payload = {
        projectId: 'proj-1',
        agentType: 'plan',
      };

      const mockSession = {
        id: 'sess-1',
        ...payload,
        title: null,
        messages: [],
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(sessionRepository, 'create').mockResolvedValue(mockSession);

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSession);
    });

    it('should return 400 for invalid agentType', async () => {
      const invalidPayload = {
        projectId: 'proj-1',
        agentType: 'invalid',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing projectId', async () => {
      const invalidPayload = {
        agentType: 'build',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return error on repository failure', async () => {
      vi.spyOn(sessionRepository, 'create').mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('PUT /api/sessions/:id', () => {
    it('should update session title', async () => {
      const mockUpdatedSession = {
        id: 'sess-1',
        projectId: 'proj-1',
        agentType: 'build',
        title: 'Updated Title',
        messages: [],
        context: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(sessionRepository, 'update').mockResolvedValue(mockUpdatedSession);

      const response = await app.request('/api/sessions/sess-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUpdatedSession);
    });

    it('should update session context', async () => {
      const mockUpdatedSession = {
        id: 'sess-1',
        projectId: 'proj-1',
        agentType: 'build',
        title: 'Test Session',
        messages: [],
        context: { model: 'gpt-4', provider: 'openai' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(sessionRepository, 'update').mockResolvedValue(mockUpdatedSession);

      const response = await app.request('/api/sessions/sess-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: { model: 'gpt-4', provider: 'openai' } }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUpdatedSession);
    });

    it('should return 404 for non-existent session', async () => {
      vi.spyOn(sessionRepository, 'update').mockResolvedValue(null);

      const response = await app.request('/api/sessions/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    it('should return error on repository failure', async () => {
      vi.spyOn(sessionRepository, 'update').mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.request('/api/sessions/sess-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete a session', async () => {
      vi.spyOn(sessionRepository, 'delete').mockResolvedValue(true);
      vi.spyOn(messageRepository, 'deleteBySession').mockResolvedValue(0);

      const response = await app.request('/api/sessions/sess-1', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session deleted successfully');
    });

    it('should return 404 for non-existent session', async () => {
      vi.spyOn(sessionRepository, 'delete').mockResolvedValue(false);

      const response = await app.request('/api/sessions/non-existent', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    it('should delete associated messages', async () => {
      vi.spyOn(sessionRepository, 'delete').mockResolvedValue(true);
      vi.spyOn(messageRepository, 'deleteBySession').mockResolvedValue(5);

      const response = await app.request('/api/sessions/sess-1', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedMessages).toBe(5);
    });

    it('should return error on repository failure', async () => {
      vi.spyOn(sessionRepository, 'delete').mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.request('/api/sessions/sess-1', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid limit parameter', async () => {
      const response = await app.request('/api/sessions?limit=invalid');

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should reject invalid offset parameter', async () => {
      const response = await app.request('/api/sessions?offset=invalid');

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should reject invalid agentType in query', async () => {
      const response = await app.request('/api/sessions?agentType=invalid');

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
