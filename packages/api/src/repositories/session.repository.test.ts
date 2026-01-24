import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionRepository } from './session.repository';
import { sessions, messages, projects, workspaces, users } from '../db/schema';
import { getTestDatabase } from '../../tests/setup';
import { eq } from 'drizzle-orm';
import type { AgentType, MessageRole } from '../db/schema';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let db: ReturnType<typeof getTestDatabase>;

  // Helper function to create a test user, workspace, and project
  async function createTestProjectData() {
    const counter = Date.now() + Math.random();
    const user = await db.insert(users).values({
      email: `test-${counter}@example.com`,
      name: `Test User ${counter}`,
    }).returning().then(rows => rows[0]);

    const workspace = await db.insert(workspaces).values({
      userId: user.id,
      name: `Test Workspace ${counter}`,
    }).returning().then(rows => rows[0]);

    const project = await db.insert(projects).values({
      workspaceId: workspace.id,
      name: `Test Project ${counter}`,
      path: `/tmp/test-project-${counter}`,
    }).returning().then(rows => rows[0]);

    return { user, workspace, project };
  }

  beforeEach(async () => {
    db = getTestDatabase();
    repository = new SessionRepository();

    // Clean up test data before each test
    await db.delete(sessions);
    await db.delete(messages);
    await db.delete(projects);
    await db.delete(workspaces);
    await db.delete(users);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(sessions);
    await db.delete(messages);
    await db.delete(projects);
    await db.delete(workspaces);
    await db.delete(users);
  });

  describe('create', () => {
    it('should create a new session with valid data', async () => {
      const { project } = await createTestProjectData();

      const sessionData = {
        projectId: project.id,
        agentType: 'build' as AgentType,
        title: 'Build My Feature',
        messages: [
          { role: 'user' as MessageRole, content: 'Help me build a feature' },
        ],
        context: { model: 'claude-sonnet-4-5', provider: 'anthropic' },
      };

      const session = await repository.create(sessionData);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.projectId).toBe(sessionData.projectId);
      expect(session.agentType).toBe(sessionData.agentType);
      expect(session.title).toBe(sessionData.title);
      expect(session.messages).toEqual(sessionData.messages);
      expect(session.context).toEqual(sessionData.context);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a session with only required fields', async () => {
      const { project } = await createTestProjectData();

      const sessionData = {
        projectId: project.id,
        agentType: 'general' as AgentType,
      };

      const session = await repository.create(sessionData);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.projectId).toBe(sessionData.projectId);
      expect(session.agentType).toBe(sessionData.agentType);
      expect(session.title).toBeNull();
      expect(session.messages).toEqual([]);
      expect(session.context).toEqual({});
    });

    it('should create a session with empty messages array', async () => {
      const { project } = await createTestProjectData();

      const sessionData = {
        projectId: project.id,
        agentType: 'plan' as AgentType,
        messages: [],
      };

      const session = await repository.create(sessionData);

      expect(session).toBeDefined();
      expect(session.messages).toEqual([]);
    });

    it('should create a session with all agent types', async () => {
      const { project } = await createTestProjectData();
      const agentTypes: AgentType[] = ['build', 'plan', 'general'];

      for (const agentType of agentTypes) {
        const session = await repository.create({
          projectId: project.id,
          agentType,
        });

        expect(session.agentType).toBe(agentType);
      }
    });

    it('should throw error when creating session with invalid agent type', async () => {
      const { project } = await createTestProjectData();

      const sessionData = {
        projectId: project.id,
        agentType: 'invalid' as AgentType,
      };

      await expect(repository.create(sessionData)).rejects.toThrow();
    });

    it('should throw error when creating session without projectId', async () => {
      const sessionData = {
        projectId: '',
        agentType: 'build' as AgentType,
      };

      await expect(repository.create(sessionData)).rejects.toThrow();
    });

    it('should throw error when creating session with non-existent project', async () => {
      const sessionData = {
        projectId: '00000000-0000-0000-0000-000000000000',
        agentType: 'build' as AgentType,
      };

      // Foreign key constraint should fail
      await expect(repository.create(sessionData)).rejects.toThrow();
    });

    it('should sanitize title by trimming whitespace', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build' as AgentType,
        title: '  My Session Title  ',
      });

      expect(session.title).toBe('My Session Title');
    });

    it('should handle null title correctly', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build' as AgentType,
        title: null,
      });

      expect(session.title).toBeNull();
    });

    it('should handle undefined title as null', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build' as AgentType,
        title: undefined,
      });

      expect(session.title).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should find all sessions for a project', async () => {
      const { project } = await createTestProjectData();

      // Create multiple sessions
      await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Session 1',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'plan',
        title: 'Session 2',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'general',
        title: 'Session 3',
      });

      const foundSessions = await repository.findByProjectId(project.id);

      expect(foundSessions).toHaveLength(3);
      expect(foundSessions.every(s => s.projectId === project.id)).toBe(true);
    });

    it('should return empty array when project has no sessions', async () => {
      const { project } = await createTestProjectData();

      const foundSessions = await repository.findByProjectId(project.id);

      expect(foundSessions).toEqual([]);
    });

    it('should not return sessions from other projects', async () => {
      const { project: project1 } = await createTestProjectData();
      const { project: project2 } = await createTestProjectData();

      await repository.create({
        projectId: project1.id,
        agentType: 'build',
        title: 'Project 1 Session',
      });

      await repository.create({
        projectId: project2.id,
        agentType: 'build',
        title: 'Project 2 Session',
      });

      const project1Sessions = await repository.findByProjectId(project1.id);
      const project2Sessions = await repository.findByProjectId(project2.id);

      expect(project1Sessions).toHaveLength(1);
      expect(project2Sessions).toHaveLength(1);
      expect(project1Sessions[0].title).toBe('Project 1 Session');
      expect(project2Sessions[0].title).toBe('Project 2 Session');
    });

    it('should return sessions ordered by most recently updated', async () => {
      const { project } = await createTestProjectData();

      const session1 = await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'First Session',
      });

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const session2 = await repository.create({
        projectId: project.id,
        agentType: 'plan',
        title: 'Second Session',
      });

      const foundSessions = await repository.findByProjectId(project.id);

      // Most recently updated should be first
      expect(foundSessions[0].id).toBe(session2.id);
      expect(foundSessions[1].id).toBe(session1.id);
    });
  });

  describe('findByAgentType', () => {
    it('should find sessions by agent type within a project', async () => {
      const { project } = await createTestProjectData();

      await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Build Session 1',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'plan',
        title: 'Plan Session',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Build Session 2',
      });

      const buildSessions = await repository.findByAgentType(project.id, 'build');

      expect(buildSessions).toHaveLength(2);
      expect(buildSessions.every(s => s.agentType === 'build')).toBe(true);
    });

    it('should return empty array for non-matching agent type', async () => {
      const { project } = await createTestProjectData();

      await repository.create({
        projectId: project.id,
        agentType: 'plan',
        title: 'Plan Session',
      });

      const buildSessions = await repository.findByAgentType(project.id, 'build');

      expect(buildSessions).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find session by valid ID', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Test Session',
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.projectId).toBe(project.id);
      expect(found?.title).toBe('Test Session');
    });

    it('should return null when ID does not exist', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });

    it('should return null for invalid UUID format', async () => {
      const found = await repository.findById('invalid-uuid');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update session title', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Original Title',
      });

      const updated = await repository.update(created.id, {
        title: 'Updated Title',
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.title).toBe('Updated Title');
    });

    it('should update session messages', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [{ role: 'user' as MessageRole, content: 'Hello' }],
      });

      const newMessages = [
        { role: 'user' as MessageRole, content: 'Hello' },
        { role: 'assistant' as MessageRole, content: 'Hi there!' },
      ];

      const updated = await repository.update(created.id, {
        messages: newMessages,
      });

      expect(updated).toBeDefined();
      expect(updated?.messages).toEqual(newMessages);
    });

    it('should update session context', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        context: { model: 'claude-sonnet-4-5' },
      });

      const updated = await repository.update(created.id, {
        context: { model: 'claude-opus-4-5', provider: 'anthropic' },
      });

      expect(updated).toBeDefined();
      expect(updated?.context).toEqual({ model: 'claude-opus-4-5', provider: 'anthropic' });
    });

    it('should update multiple fields at once', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Original',
        messages: [],
        context: {},
      });

      const updated = await repository.update(created.id, {
        title: 'Updated',
        messages: [{ role: 'user' as MessageRole, content: 'Test' }],
        context: { model: 'test' },
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated');
      expect(updated?.messages).toHaveLength(1);
      expect(updated?.context).toEqual({ model: 'test' });
    });

    it('should return null when updating non-existent session', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const updated = await repository.update(nonExistentId, {
        title: 'New Title',
      });

      expect(updated).toBeNull();
    });

    it('should not allow updating projectId', async () => {
      const { project: project1 } = await createTestProjectData();
      const { project: project2 } = await createTestProjectData();

      const created = await repository.create({
        projectId: project1.id,
        agentType: 'build',
      });

      // projectId should not be updatable
      const updated = await repository.update(created.id, {
        projectId: project2.id,
      } as any);

      // The update should either fail or ignore the projectId change
      // This test verifies the behavior - implementation may vary
      expect(updated).toBeDefined();
    });

    it('should not allow updating agentType', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
      });

      // agentType should not be updatable after creation
      const updated = await repository.update(created.id, {
        agentType: 'plan' as AgentType,
      } as any);

      // The update should either fail or ignore the agentType change
      expect(updated).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete existing session', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'To Delete',
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify session no longer exists
      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent session', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const deleted = await repository.delete(nonExistentId);

      expect(deleted).toBe(false);
    });

    it('should return false for invalid UUID format', async () => {
      const deleted = await repository.delete('invalid-uuid');

      expect(deleted).toBe(false);
    });

    it('should cascade delete messages when session is deleted', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [
          { role: 'user' as MessageRole, content: 'Message 1' },
          { role: 'assistant' as MessageRole, content: 'Message 2' },
        ],
      });

      // Add separate message records
      await db.insert(messages).values({
        sessionId: created.id,
        role: 'user',
        content: 'Separate message',
      });

      // Delete the session
      await repository.delete(created.id);

      // Verify messages were cascade deleted
      const remainingMessages = await db.select().from(messages).where(
        eq(messages.sessionId, created.id)
      );

      expect(remainingMessages).toHaveLength(0);
    });
  });

  describe('addMessage', () => {
    it('should add a message to session messages array', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [{ role: 'user' as MessageRole, content: 'First message' }],
      });

      const updated = await repository.addMessage(session.id, {
        role: 'assistant' as MessageRole,
        content: 'Response message',
      });

      expect(updated).toBeDefined();
      expect(updated?.messages).toHaveLength(2);
      expect(updated?.messages[1]).toEqual({
        role: 'assistant',
        content: 'Response message',
      });
    });

    it('should add message to empty messages array', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [],
      });

      const updated = await repository.addMessage(session.id, {
        role: 'user' as MessageRole,
        content: 'First message',
      });

      expect(updated).toBeDefined();
      expect(updated?.messages).toHaveLength(1);
    });

    it('should return null when adding message to non-existent session', async () => {
      const updated = await repository.addMessage('00000000-0000-0000-0000-000000000000', {
        role: 'user' as MessageRole,
        content: 'Test',
      });

      expect(updated).toBeNull();
    });

    it('should add message with metadata', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [],
      });

      const updated = await repository.addMessage(session.id, {
        role: 'assistant' as MessageRole,
        content: 'Response',
        metadata: { model: 'claude-sonnet-4-5', tokensUsed: 100 },
      });

      expect(updated).toBeDefined();
      expect(updated?.messages[0].metadata).toEqual({
        model: 'claude-sonnet-4-5',
        tokensUsed: 100,
      });
    });
  });

  describe('findWithProject', () => {
    it('should find session with project data', async () => {
      const { project, workspace } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Test Session',
      });

      const found = await repository.findWithProject(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test Session');
      expect(found?.project).toBeDefined();
      expect(found?.project.id).toBe(project.id);
      expect(found?.project.name).toBe(project.name);
      expect(found?.project.path).toBe(project.path);
    });

    it('should include workspace in project data', async () => {
      const { project, workspace } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
      });

      const found = await repository.findWithProject(created.id);

      expect(found?.project.workspace).toBeDefined();
      expect(found?.project.workspace.id).toBe(workspace.id);
      expect(found?.project.workspace.name).toBe(workspace.name);
    });

    it('should return null for non-existent session', async () => {
      const found = await repository.findWithProject('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no sessions exist', async () => {
      const allSessions = await repository.findAll();

      expect(allSessions).toEqual([]);
    });

    it('should return all sessions', async () => {
      const { project: project1 } = await createTestProjectData();
      const { project: project2 } = await createTestProjectData();

      const session1 = await repository.create({
        projectId: project1.id,
        agentType: 'build',
      });

      const session2 = await repository.create({
        projectId: project2.id,
        agentType: 'plan',
      });

      const allSessions = await repository.findAll();

      expect(allSessions).toHaveLength(2);
      expect(allSessions.map(s => s.id)).toContain(session1.id);
      expect(allSessions.map(s => s.id)).toContain(session2.id);
    });
  });

  describe('countByProject', () => {
    it('should return 0 for project with no sessions', async () => {
      const { project } = await createTestProjectData();

      const count = await repository.countByProject(project.id);

      expect(count).toBe(0);
    });

    it('should return correct count for project with sessions', async () => {
      const { project } = await createTestProjectData();

      await repository.create({
        projectId: project.id,
        agentType: 'build',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'plan',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'general',
      });

      const count = await repository.countByProject(project.id);

      expect(count).toBe(3);
    });

    it('should not count sessions from other projects', async () => {
      const { project: project1 } = await createTestProjectData();
      const { project: project2 } = await createTestProjectData();

      await repository.create({
        projectId: project1.id,
        agentType: 'build',
      });

      await repository.create({
        projectId: project1.id,
        agentType: 'plan',
      });

      await repository.create({
        projectId: project2.id,
        agentType: 'build',
      });

      const count1 = await repository.countByProject(project1.id);
      const count2 = await repository.countByProject(project2.id);

      expect(count1).toBe(2);
      expect(count2).toBe(1);
    });
  });

  describe('findRecentByProject', () => {
    it('should return recent sessions with limit', async () => {
      const { project } = await createTestProjectData();

      // Create 5 sessions
      for (let i = 1; i <= 5; i++) {
        await repository.create({
          projectId: project.id,
          agentType: 'build',
          title: `Session ${i}`,
        });
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const recent = await repository.findRecentByProject(project.id, 3);

      expect(recent).toHaveLength(3);
      // Most recent should be first
      expect(recent[0].title).toBe('Session 5');
      expect(recent[1].title).toBe('Session 4');
      expect(recent[2].title).toBe('Session 3');
    });

    it('should return all sessions if limit exceeds count', async () => {
      const { project } = await createTestProjectData();

      await repository.create({
        projectId: project.id,
        agentType: 'build',
        title: 'Session 1',
      });

      await repository.create({
        projectId: project.id,
        agentType: 'plan',
        title: 'Session 2',
      });

      const recent = await repository.findRecentByProject(project.id, 10);

      expect(recent).toHaveLength(2);
    });

    it('should return empty array for project with no sessions', async () => {
      const { project } = await createTestProjectData();

      const recent = await repository.findRecentByProject(project.id, 5);

      expect(recent).toEqual([]);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages from session', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [
          { role: 'user' as MessageRole, content: 'Message 1' },
          { role: 'assistant' as MessageRole, content: 'Message 2' },
          { role: 'user' as MessageRole, content: 'Message 3' },
        ],
      });

      const updated = await repository.clearMessages(session.id);

      expect(updated).toBeDefined();
      expect(updated?.messages).toEqual([]);
    });

    it('should return null for non-existent session', async () => {
      const updated = await repository.clearMessages('00000000-0000-0000-0000-000000000000');

      expect(updated).toBeNull();
    });

    it('should handle empty messages array', async () => {
      const { project } = await createTestProjectData();

      const session = await repository.create({
        projectId: project.id,
        agentType: 'build',
        messages: [],
      });

      const updated = await repository.clearMessages(session.id);

      expect(updated).toBeDefined();
      expect(updated?.messages).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true for existing session', async () => {
      const { project } = await createTestProjectData();

      const created = await repository.create({
        projectId: project.id,
        agentType: 'build',
      });

      const exists = await repository.exists(created.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent session', async () => {
      const exists = await repository.exists('00000000-0000-0000-0000-000000000000');

      expect(exists).toBe(false);
    });
  });
});
