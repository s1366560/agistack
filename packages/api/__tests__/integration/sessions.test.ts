/**
 * Integration Tests for Sessions API
 *
 * Tests the sessions CRUD endpoints against actual database
 * following TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { sessionsRouter } from '../../src/routes/sessions';
import {
  getTestDatabase,
  cleanTestDatabase,
  createTestUser,
  createTestWorkspace,
  createTestProject,
  createTestSession,
  createTestMessage,
} from '../helpers/integration';

describe('Sessions API Integration Tests', () => {
  let app: Hono;
  let db: ReturnType<typeof getTestDatabase>;

  beforeEach(async () => {
    app = new Hono();
    app.route('/api/sessions', sessionsRouter);
    db = getTestDatabase();
    await cleanTestDatabase(db);
  });

  afterEach(async () => {
    await cleanTestDatabase(db);
  });

  // Helper to create a test project for sessions
  async function createTestProjectForSessions() {
    const user = await createTestUser(db);
    const workspace = await createTestWorkspace(db, user.id);
    const project = await createTestProject(db, workspace.id);
    return { user, workspace, project };
  }

  describe('GET /api/sessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const response = await app.request('/api/sessions');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return list of sessions', async () => {
      const { project } = await createTestProjectForSessions();
      await createTestSession(db, project.id, { agentType: 'build' });
      await createTestSession(db, project.id, { agentType: 'plan' });

      const response = await app.request('/api/sessions');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should filter by projectId', async () => {
      const { project: project1 } = await createTestProjectForSessions();
      const { project: project2 } = await createTestProjectForSessions();

      await createTestSession(db, project1.id, { title: 'Session 1' });
      await createTestSession(db, project2.id, { title: 'Session 2' });
      await createTestSession(db, project1.id, { title: 'Session 3' });

      const response = await app.request(`/api/sessions?projectId=${project1.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data.every((s: any) => s.projectId === project1.id)).toBe(true);
    });

    it('should filter by agentType when projectId provided', async () => {
      const { project } = await createTestProjectForSessions();

      await createTestSession(db, project.id, { agentType: 'build' as const, title: 'Build 1' });
      await createTestSession(db, project.id, { agentType: 'plan' as const, title: 'Plan 1' });
      await createTestSession(db, project.id, { agentType: 'build' as const, title: 'Build 2' });

      const response = await app.request(`/api/sessions?projectId=${project.id}&agentType=build`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data.every((s: any) => s.agentType === 'build')).toBe(true);
    });

    it('should support pagination with limit parameter', async () => {
      const { project } = await createTestProjectForSessions();
      for (let i = 0; i < 5; i++) {
        await createTestSession(db, project.id);
      }

      const response = await app.request('/api/sessions?limit=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(2);
    });

    it('should support pagination with offset parameter', async () => {
      const { project } = await createTestProjectForSessions();
      const sessionIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const session = await createTestSession(db, project.id);
        sessionIds.push(session.id);
      }

      const response = await app.request('/api/sessions?limit=2&offset=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(2);
    });

    it('should validate agentType in query', async () => {
      const response = await app.request('/api/sessions?agentType=invalid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate limit parameter (invalid number)', async () => {
      const response = await app.request('/api/sessions?limit=invalid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate offset parameter (invalid number)', async () => {
      const response = await app.request('/api/sessions?offset=invalid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with messages', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id, {
        title: 'Test Session',
        agentType: 'build',
      });
      await createTestMessage(db, session.id, {
        role: 'user',
        content: 'Hello',
      });
      await createTestMessage(db, session.id, {
        role: 'assistant',
        content: 'Hi there!',
      });

      const response = await app.request(`/api/sessions/${session.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.session.id).toBe(session.id);
      expect(data.data.session.title).toBe('Test Session');
      expect(data.data.messages).toHaveLength(2);
      expect(data.data.messages[0].role).toBe('user');
      expect(data.data.messages[1].role).toBe('assistant');
    });

    it('should return session without messages when none exist', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);

      const response = await app.request(`/api/sessions/${session.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.session.id).toBe(session.id);
      expect(data.data.messages).toEqual([]);
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/sessions/${nonExistentId}`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    it('should include all session fields', async () => {
      const { project } = await createTestProjectForSessions();
      const context = { model: 'gpt-4', provider: 'openai' };
      const session = await createTestSession(db, project.id, {
        title: 'Full Session',
        context,
      });

      const response = await app.request(`/api/sessions/${session.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.session).toMatchObject({
        id: session.id,
        projectId: project.id,
        title: 'Full Session',
        agentType: session.agentType,
        context,
      });
      expect(data.data.session.createdAt).toBeDefined();
      expect(data.data.session.updatedAt).toBeDefined();
    });
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const { project } = await createTestProjectForSessions();
      const newSession = {
        projectId: project.id,
        agentType: 'build',
        title: 'Build Session',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.projectId).toBe(project.id);
      expect(data.data.agentType).toBe('build');
      expect(data.data.title).toBe('Build Session');
      expect(data.data.id).toBeDefined();
      expect(data.data.createdAt).toBeDefined();
    });

    it('should create session with plan agentType', async () => {
      const { project } = await createTestProjectForSessions();
      const newSession = {
        projectId: project.id,
        agentType: 'plan',
        title: 'Planning Session',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.agentType).toBe('plan');
    });

    it('should create session with general agentType', async () => {
      const { project } = await createTestProjectForSessions();
      const newSession = {
        projectId: project.id,
        agentType: 'general',
        title: 'General Session',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.agentType).toBe('general');
    });

    it('should create session without optional title', async () => {
      const { project } = await createTestProjectForSessions();
      const newSession = {
        projectId: project.id,
        agentType: 'build',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.title).toBeNull();
    });

    it('should validate required field: projectId', async () => {
      const invalidSession = {
        agentType: 'build',
        title: 'Test',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidSession),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate required field: agentType', async () => {
      const { project } = await createTestProjectForSessions();
      const invalidSession = {
        projectId: project.id,
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidSession),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate agentType enum', async () => {
      const { project } = await createTestProjectForSessions();
      const invalidSession = {
        projectId: project.id,
        agentType: 'invalid',
      };

      const response = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidSession),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/sessions/:id', () => {
    it('should update session title', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id, { title: 'Original Title' });

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
      expect(data.data.id).toBe(session.id);
    });

    it('should update session context', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);
      const context = { model: 'gpt-4', provider: 'openai', temperature: 0.7 };

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.context).toEqual(context);
    });

    it('should update both title and context', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);
      const context = { model: 'claude-3' };

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Title',
          context,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe('New Title');
      expect(data.data.context).toEqual(context);
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/sessions/${nonExistentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    it('should allow empty update (no changes)', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id, {
        title: 'Test Title',
      });

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.title).toBe('Test Title');
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete a session', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session deleted successfully');
    });

    it('should delete associated messages', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);
      await createTestMessage(db, session.id);
      await createTestMessage(db, session.id);
      await createTestMessage(db, session.id);

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deletedMessages).toBe(3);
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/sessions/${nonExistentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    it('should return 0 deletedMessages when session has no messages', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);

      const response = await app.request(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deletedMessages).toBe(0);
    });

    it('should verify session is actually deleted', async () => {
      const { project } = await createTestProjectForSessions();
      const session = await createTestSession(db, project.id);

      // Delete the session
      const deleteResponse = await app.request(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });
      expect(deleteResponse.status).toBe(200);

      // Verify it's gone
      const getResponse = await app.request(`/api/sessions/${session.id}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Response Format', () => {
    it('should follow consistent API response structure for success', async () => {
      const { project } = await createTestProjectForSessions();
      await createTestSession(db, project.id);

      const response = await app.request('/api/sessions');
      const data = await response.json();

      expect(Object.keys(data)).toContain('success');
      expect(Object.keys(data)).toContain('data');
      expect(Object.keys(data)).toContain('timestamp');
      expect(data.success).toBe(true);
    });

    it('should follow consistent API response structure for errors', async () => {
      const response = await app.request('/api/sessions/invalid-id');
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });
  });
});
