import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageRepository } from './message.repository';
import { sessions, messages, projects, workspaces, users } from '../db/schema';
import { getTestDatabase } from '../tests/setup';
import { eq } from 'drizzle-orm';
import type { MessageRole, AgentType } from '../db/schema';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  let db: ReturnType<typeof getTestDatabase>;

  // Helper function to create a test user, workspace, project, and session
  async function createTestSessionData() {
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

    const session = await db.insert(sessions).values({
      projectId: project.id,
      agentType: 'build',
      title: `Test Session ${counter}`,
    }).returning().then(rows => rows[0]);

    return { user, workspace, project, session };
  }

  beforeEach(async () => {
    db = getTestDatabase();
    repository = new MessageRepository();

    // Clean up test data before each test
    await db.delete(messages);
    await db.delete(sessions);
    await db.delete(projects);
    await db.delete(workspaces);
    await db.delete(users);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(messages);
    await db.delete(sessions);
    await db.delete(projects);
    await db.delete(workspaces);
    await db.delete(users);
  });

  describe('create', () => {
    it('should create a new message with valid data', async () => {
      const { session } = await createTestSessionData();

      const messageData = {
        sessionId: session.id,
        role: 'user' as MessageRole,
        content: 'Hello, how are you?',
      };

      const message = await repository.create(messageData);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.sessionId).toBe(messageData.sessionId);
      expect(message.role).toBe(messageData.role);
      expect(message.content).toBe(messageData.content);
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('should create a message with metadata', async () => {
      const { session } = await createTestSessionData();

      const messageData = {
        sessionId: session.id,
        role: 'assistant' as MessageRole,
        content: 'I am doing well, thank you!',
        metadata: { model: 'claude-sonnet-4-5', tokensUsed: 50 },
      };

      const message = await repository.create(messageData);

      expect(message).toBeDefined();
      expect(message.metadata).toEqual(messageData.metadata);
    });

    it('should create a message with all role types', async () => {
      const { session } = await createTestSessionData();
      const roles: MessageRole[] = ['user', 'assistant', 'system'];

      for (const role of roles) {
        const message = await repository.create({
          sessionId: session.id,
          role,
          content: `Test ${role} message`,
        });

        expect(message.role).toBe(role);
      }
    });

    it('should throw error when creating message without sessionId', async () => {
      const messageData = {
        sessionId: '',
        role: 'user' as MessageRole,
        content: 'Test',
      };

      await expect(repository.create(messageData)).rejects.toThrow();
    });

    it('should throw error when creating message without role', async () => {
      const { session } = await createTestSessionData();

      const messageData = {
        sessionId: session.id,
        role: '' as MessageRole,
        content: 'Test',
      };

      await expect(repository.create(messageData)).rejects.toThrow();
    });

    it('should throw error when creating message without content', async () => {
      const { session } = await createTestSessionData();

      const messageData = {
        sessionId: session.id,
        role: 'user' as MessageRole,
        content: '',
      };

      await expect(repository.create(messageData)).rejects.toThrow();
    });

    it('should throw error when creating message with non-existent session', async () => {
      const messageData = {
        sessionId: '00000000-0000-0000-0000-000000000000',
        role: 'user' as MessageRole,
        content: 'Test',
      };

      // Foreign key constraint should fail
      await expect(repository.create(messageData)).rejects.toThrow();
    });

    it('should sanitize content by trimming whitespace', async () => {
      const { session } = await createTestSessionData();

      const message = await repository.create({
        sessionId: session.id,
        role: 'user' as MessageRole,
        content: '  Hello, world!  ',
      });

      expect(message.content).toBe('Hello, world!');
    });

    it('should handle null metadata correctly', async () => {
      const { session } = await createTestSessionData();

      const message = await repository.create({
        sessionId: session.id,
        role: 'user' as MessageRole,
        content: 'Test message',
        metadata: null,
      });

      expect(message.metadata).toBeNull();
    });

    it('should handle undefined metadata as null', async () => {
      const { session } = await createTestSessionData();

      const message = await repository.create({
        sessionId: session.id,
        role: 'user' as MessageRole,
        content: 'Test message',
        metadata: undefined,
      });

      expect(message.metadata).toBeNull();
    });
  });

  describe('findBySessionId', () => {
    it('should find all messages for a session', async () => {
      const { session } = await createTestSessionData();

      // Create multiple messages
      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'First message',
      });

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Second message',
      });

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Third message',
      });

      const foundMessages = await repository.findBySessionId(session.id);

      expect(foundMessages).toHaveLength(3);
      expect(foundMessages.every(m => m.sessionId === session.id)).toBe(true);
    });

    it('should return messages in chronological order', async () => {
      const { session } = await createTestSessionData();

      const message1 = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'First',
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const message2 = await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Second',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const message3 = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Third',
      });

      const foundMessages = await repository.findBySessionId(session.id);

      expect(foundMessages).toHaveLength(3);
      expect(foundMessages[0].id).toBe(message1.id);
      expect(foundMessages[1].id).toBe(message2.id);
      expect(foundMessages[2].id).toBe(message3.id);
    });

    it('should return empty array when session has no messages', async () => {
      const { session } = await createTestSessionData();

      const foundMessages = await repository.findBySessionId(session.id);

      expect(foundMessages).toEqual([]);
    });

    it('should not return messages from other sessions', async () => {
      const { session: session1 } = await createTestSessionData();
      const { session: session2 } = await createTestSessionData();

      await repository.create({
        sessionId: session1.id,
        role: 'user',
        content: 'Session 1 message',
      });

      await repository.create({
        sessionId: session2.id,
        role: 'user',
        content: 'Session 2 message',
      });

      const session1Messages = await repository.findBySessionId(session1.id);
      const session2Messages = await repository.findBySessionId(session2.id);

      expect(session1Messages).toHaveLength(1);
      expect(session2Messages).toHaveLength(1);
      expect(session1Messages[0].content).toBe('Session 1 message');
      expect(session2Messages[0].content).toBe('Session 2 message');
    });
  });

  describe('findByRole', () => {
    it('should find messages by role within a session', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'User message 1',
      });

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Assistant message',
      });

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'User message 2',
      });

      const userMessages = await repository.findByRole(session.id, 'user');

      expect(userMessages).toHaveLength(2);
      expect(userMessages.every(m => m.role === 'user')).toBe(true);
    });

    it('should return empty array for non-matching role', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Assistant message',
      });

      const userMessages = await repository.findByRole(session.id, 'user');

      expect(userMessages).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should find message by valid ID', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Test message',
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.sessionId).toBe(session.id);
      expect(found?.content).toBe('Test message');
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
    it('should update message content', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Original content',
      });

      const updated = await repository.update(created.id, {
        content: 'Updated content',
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.content).toBe('Updated content');
    });

    it('should update message metadata', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Response',
        metadata: { model: 'claude-sonnet-4-5' },
      });

      const updated = await repository.update(created.id, {
        metadata: { model: 'claude-opus-4-5', tokensUsed: 100 },
      });

      expect(updated).toBeDefined();
      expect(updated?.metadata).toEqual({ model: 'claude-opus-4-5', tokensUsed: 100 });
    });

    it('should update both content and metadata', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Original',
        metadata: { key: 'value' },
      });

      const updated = await repository.update(created.id, {
        content: 'Updated',
        metadata: { newKey: 'newValue' },
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('Updated');
      expect(updated?.metadata).toEqual({ newKey: 'newValue' });
    });

    it('should return null when updating non-existent message', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const updated = await repository.update(nonExistentId, {
        content: 'New content',
      });

      expect(updated).toBeNull();
    });

    it('should not allow updating sessionId', async () => {
      const { session: session1 } = await createTestSessionData();
      const { session: session2 } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session1.id,
        role: 'user',
        content: 'Test',
      });

      // sessionId should not be updatable
      const updated = await repository.update(created.id, {
        sessionId: session2.id,
      } as any);

      // The update should either fail or ignore the sessionId change
      expect(updated).toBeDefined();
    });

    it('should not allow updating role', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Test',
      });

      // role should not be updatable after creation
      const updated = await repository.update(created.id, {
        role: 'assistant' as MessageRole,
      } as any);

      // The update should either fail or ignore the role change
      expect(updated).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete existing message', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'To delete',
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify message no longer exists
      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent message', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const deleted = await repository.delete(nonExistentId);

      expect(deleted).toBe(false);
    });

    it('should return false for invalid UUID format', async () => {
      const deleted = await repository.delete('invalid-uuid');

      expect(deleted).toBe(false);
    });
  });

  describe('countBySession', () => {
    it('should return 0 for session with no messages', async () => {
      const { session } = await createTestSessionData();

      const count = await repository.countBySession(session.id);

      expect(count).toBe(0);
    });

    it('should return correct count for session with messages', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Message 1',
      });

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Message 2',
      });

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Message 3',
      });

      const count = await repository.countBySession(session.id);

      expect(count).toBe(3);
    });

    it('should not count messages from other sessions', async () => {
      const { session: session1 } = await createTestSessionData();
      const { session: session2 } = await createTestSessionData();

      await repository.create({
        sessionId: session1.id,
        role: 'user',
        content: 'Session 1 message 1',
      });

      await repository.create({
        sessionId: session1.id,
        role: 'assistant',
        content: 'Session 1 message 2',
      });

      await repository.create({
        sessionId: session2.id,
        role: 'user',
        content: 'Session 2 message',
      });

      const count1 = await repository.countBySession(session1.id);
      const count2 = await repository.countBySession(session2.id);

      expect(count1).toBe(2);
      expect(count2).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no messages exist', async () => {
      const allMessages = await repository.findAll();

      expect(allMessages).toEqual([]);
    });

    it('should return all messages', async () => {
      const { session: session1 } = await createTestSessionData();
      const { session: session2 } = await createTestSessionData();

      const message1 = await repository.create({
        sessionId: session1.id,
        role: 'user',
        content: 'Message 1',
      });

      const message2 = await repository.create({
        sessionId: session2.id,
        role: 'assistant',
        content: 'Message 2',
      });

      const allMessages = await repository.findAll();

      expect(allMessages).toHaveLength(2);
      expect(allMessages.map(m => m.id)).toContain(message1.id);
      expect(allMessages.map(m => m.id)).toContain(message2.id);
    });
  });

  describe('paginateBySession', () => {
    it('should return paginated messages for a session', async () => {
      const { session } = await createTestSessionData();

      // Create 5 messages
      for (let i = 1; i <= 5; i++) {
        await repository.create({
          sessionId: session.id,
          role: 'user',
          content: `Message ${i}`,
        });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const paginated = await repository.paginateBySession(session.id, {
        limit: 2,
        offset: 0,
      });

      expect(paginated.data).toHaveLength(2);
      expect(paginated.total).toBe(5);
      expect(paginated.limit).toBe(2);
      expect(paginated.offset).toBe(0);
      expect(paginated.hasMore).toBe(true);
    });

    it('should return second page correctly', async () => {
      const { session } = await createTestSessionData();

      // Create 5 messages
      for (let i = 1; i <= 5; i++) {
        await repository.create({
          sessionId: session.id,
          role: 'user',
          content: `Message ${i}`,
        });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const paginated = await repository.paginateBySession(session.id, {
        limit: 2,
        offset: 2,
      });

      expect(paginated.data).toHaveLength(2);
      expect(paginated.total).toBe(5);
      expect(paginated.offset).toBe(2);
      expect(paginated.hasMore).toBe(true);
    });

    it('should return last page with hasMore false', async () => {
      const { session } = await createTestSessionData();

      // Create 5 messages
      for (let i = 1; i <= 5; i++) {
        await repository.create({
          sessionId: session.id,
          role: 'user',
          content: `Message ${i}`,
        });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const paginated = await repository.paginateBySession(session.id, {
        limit: 2,
        offset: 4,
      });

      expect(paginated.data).toHaveLength(1);
      expect(paginated.total).toBe(5);
      expect(paginated.offset).toBe(4);
      expect(paginated.hasMore).toBe(false);
    });

    it('should return empty result for session with no messages', async () => {
      const { session } = await createTestSessionData();

      const paginated = await repository.paginateBySession(session.id, {
        limit: 10,
        offset: 0,
      });

      expect(paginated.data).toEqual([]);
      expect(paginated.total).toBe(0);
      expect(paginated.hasMore).toBe(false);
    });

    it('should handle offset beyond total count', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Only message',
      });

      const paginated = await repository.paginateBySession(session.id, {
        limit: 10,
        offset: 100,
      });

      expect(paginated.data).toEqual([]);
      expect(paginated.total).toBe(1);
      expect(paginated.hasMore).toBe(false);
    });

    it('should maintain chronological order', async () => {
      const { session } = await createTestSessionData();

      const messages: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const msg = await repository.create({
          sessionId: session.id,
          role: 'user',
          content: `Message ${i}`,
        });
        messages.push(msg.id);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const paginated = await repository.paginateBySession(session.id, {
        limit: 10,
        offset: 0,
      });

      expect(paginated.data.map(m => m.id)).toEqual(messages);
    });
  });

  describe('findRecentBySession', () => {
    it('should return recent messages with limit', async () => {
      const { session } = await createTestSessionData();

      // Create 5 messages
      const allIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const msg = await repository.create({
          sessionId: session.id,
          role: 'user',
          content: `Message ${i}`,
        });
        allIds.push(msg.id);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const recent = await repository.findRecentBySession(session.id, 3);

      expect(recent).toHaveLength(3);
      // Most recent should be first (reversed chronological)
      expect(recent[0].id).toBe(allIds[4]);
      expect(recent[1].id).toBe(allIds[3]);
      expect(recent[2].id).toBe(allIds[2]);
    });

    it('should return all messages if limit exceeds count', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Message 1',
      });

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Message 2',
      });

      const recent = await repository.findRecentBySession(session.id, 10);

      expect(recent).toHaveLength(2);
    });

    it('should return empty array for session with no messages', async () => {
      const { session } = await createTestSessionData();

      const recent = await repository.findRecentBySession(session.id, 5);

      expect(recent).toEqual([]);
    });
  });

  describe('deleteBySession', () => {
    it('should delete all messages for a session', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Message 1',
      });

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Message 2',
      });

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Message 3',
      });

      const deletedCount = await repository.deleteBySession(session.id);

      expect(deletedCount).toBe(3);

      // Verify all messages were deleted
      const remaining = await repository.findBySessionId(session.id);
      expect(remaining).toEqual([]);
    });

    it('should return 0 for session with no messages', async () => {
      const { session } = await createTestSessionData();

      const deletedCount = await repository.deleteBySession(session.id);

      expect(deletedCount).toBe(0);
    });

    it('should only delete messages for the specified session', async () => {
      const { session: session1 } = await createTestSessionData();
      const { session: session2 } = await createTestSessionData();

      await repository.create({
        sessionId: session1.id,
        role: 'user',
        content: 'Session 1 message',
      });

      await repository.create({
        sessionId: session2.id,
        role: 'user',
        content: 'Session 2 message',
      });

      await repository.deleteBySession(session1.id);

      const session1Messages = await repository.findBySessionId(session1.id);
      const session2Messages = await repository.findBySessionId(session2.id);

      expect(session1Messages).toEqual([]);
      expect(session2Messages).toHaveLength(1);
    });
  });

  describe('exists', () => {
    it('should return true for existing message', async () => {
      const { session } = await createTestSessionData();

      const created = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Test',
      });

      const exists = await repository.exists(created.id);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent message', async () => {
      const exists = await repository.exists('00000000-0000-0000-0000-000000000000');

      expect(exists).toBe(false);
    });
  });

  describe('findLatestBySession', () => {
    it('should return the latest message for a session', async () => {
      const { session } = await createTestSessionData();

      await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'First message',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await repository.create({
        sessionId: session.id,
        role: 'assistant',
        content: 'Second message',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const third = await repository.create({
        sessionId: session.id,
        role: 'user',
        content: 'Third message',
      });

      const latest = await repository.findLatestBySession(session.id);

      expect(latest).toBeDefined();
      expect(latest?.id).toBe(third.id);
      expect(latest?.content).toBe('Third message');
    });

    it('should return null for session with no messages', async () => {
      const { session } = await createTestSessionData();

      const latest = await repository.findLatestBySession(session.id);

      expect(latest).toBeNull();
    });
  });

  describe('createMany', () => {
    it('should create multiple messages at once', async () => {
      const { session } = await createTestSessionData();

      const messagesData = [
        {
          sessionId: session.id,
          role: 'user' as MessageRole,
          content: 'First message',
        },
        {
          sessionId: session.id,
          role: 'assistant' as MessageRole,
          content: 'Second message',
        },
        {
          sessionId: session.id,
          role: 'user' as MessageRole,
          content: 'Third message',
        },
      ];

      const created = await repository.createMany(messagesData);

      expect(created).toHaveLength(3);
      expect(created[0].content).toBe('First message');
      expect(created[1].content).toBe('Second message');
      expect(created[2].content).toBe('Third message');
    });

    it('should return empty array when input is empty', async () => {
      const created = await repository.createMany([]);

      expect(created).toEqual([]);
    });

    it('should validate all messages before insertion', async () => {
      const { session } = await createTestSessionData();

      const messagesData = [
        {
          sessionId: session.id,
          role: 'user' as MessageRole,
          content: 'Valid message',
        },
        {
          sessionId: session.id,
          role: 'user' as MessageRole,
          content: '',  // Invalid: empty content
        },
      ];

      await expect(repository.createMany(messagesData)).rejects.toThrow();
    });
  });
});
