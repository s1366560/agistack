/**
 * Tests for AgentToolUsageRepository
 *
 * TDD: Tests written before implementation
 * RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentToolUsageRepository } from './agent-tool-usage.repository';
import { getTestDatabase, cleanTestDatabase, createTestUser, createTestWorkspace, createTestProject, createTestSession } from '../../__tests__/helpers/integration';
import { sql } from 'drizzle-orm';

describe('AgentToolUsageRepository', () => {
  let repository: AgentToolUsageRepository;
  let db: ReturnType<typeof getTestDatabase>;

  beforeEach(async () => {
    db = getTestDatabase();
    await cleanTestDatabase(db);
    repository = new AgentToolUsageRepository();
  });

  // Helper to create test execution
  async function createTestExecution() {
    const user = await createTestUser(db);
    const workspace = await createTestWorkspace(db, user.id);
    const project = await createTestProject(db, workspace.id);
    const session = await createTestSession(db, project.id);

    // Create an execution using Drizzle
    const executionId = crypto.randomUUID();
    const now = new Date().toISOString();

    (db as any).run(
      sql`INSERT INTO agent_executions (id, session_id, agent_type, state, input_prompt, steps, tokens_used, started_at, created_at, updated_at)
          VALUES (${executionId}, ${session.id}, 'build', 'completed', 'Test prompt', '[]', '{"input": 0, "output": 0, "total": 0}', ${now}, ${now}, ${now})`
    );

    return executionId;
  }

  describe('findById', () => {
    it('should return usage record by ID', async () => {
      const executionId = await createTestExecution();

      const created = await repository.create({
        executionId,
        toolName: 'read-file',
        arguments: { path: '/test.txt' },
        result: 'File content',
        durationMs: 100,
        success: true,
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.executionId).toBe(executionId);
      expect(found?.toolName).toBe('read-file');
    });

    it('should return null when usage record not found', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should return null for empty ID', async () => {
      const found = await repository.findById('');

      expect(found).toBeNull();
    });

    it('should return null for undefined ID', async () => {
      const found = await repository.findById(undefined as any);

      expect(found).toBeNull();
    });
  });

  describe('findByExecution', () => {
    it('should return all usage records for an execution', async () => {
      const executionId = await createTestExecution();

      await repository.create({
        executionId,
        toolName: 'read-file',
        arguments: { path: '/test.txt' },
        result: 'Content',
        durationMs: 50,
        success: true,
      });

      await repository.create({
        executionId,
        toolName: 'write-file',
        arguments: { path: '/test.txt', content: 'Hello' },
        result: 'Written',
        durationMs: 75,
        success: true,
      });

      await repository.create({
        executionId,
        toolName: 'delete-file',
        arguments: { path: '/old.txt' },
        result: 'Deleted',
        durationMs: 25,
        success: true,
      });

      const usages = await repository.findByExecution(executionId);

      expect(usages).toHaveLength(3);
      expect(usages.map((u) => u.toolName)).toContain('read-file');
      expect(usages.map((u) => u.toolName)).toContain('write-file');
      expect(usages.map((u) => u.toolName)).toContain('delete-file');
    });

    it('should return empty array when no usage records exist for execution', async () => {
      const executionId = await createTestExecution();

      const usages = await repository.findByExecution(executionId);

      expect(usages).toEqual([]);
    });

    it('should only return records for the specified execution', async () => {
      const executionId1 = await createTestExecution();
      const executionId2 = await createTestExecution();

      await repository.create({
        executionId: executionId1,
        toolName: 'tool-1',
        success: true,
      });

      await repository.create({
        executionId: executionId2,
        toolName: 'tool-2',
        success: true,
      });

      const usages1 = await repository.findByExecution(executionId1);
      const usages2 = await repository.findByExecution(executionId2);

      expect(usages1).toHaveLength(1);
      expect(usages2).toHaveLength(1);
      expect(usages1[0].toolName).toBe('tool-1');
      expect(usages2[0].toolName).toBe('tool-2');
    });

    it('should order by creation date ascending', async () => {
      const executionId = await createTestExecution();

      await repository.create({
        executionId,
        toolName: 'first',
        success: true,
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await repository.create({
        executionId,
        toolName: 'second',
        success: true,
      });

      const usages = await repository.findByExecution(executionId);

      expect(usages[0].toolName).toBe('first');
      expect(usages[1].toolName).toBe('second');
    });
  });

  describe('create', () => {
    it('should create a new usage record', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'search-files',
        arguments: { query: 'test', path: '/' },
        result: 'Found 5 files',
        durationMs: 250,
        success: true,
      });

      expect(usage).toBeDefined();
      expect(usage.id).toBeDefined();
      expect(usage.executionId).toBe(executionId);
      expect(usage.toolName).toBe('search-files');
      expect(usage.arguments).toEqual({ query: 'test', path: '/' });
      expect(usage.result).toBe('Found 5 files');
      expect(usage.durationMs).toBe(250);
      expect(usage.success).toBe(true);
      expect(usage.errorMessage).toBeNull();
      expect(usage.createdAt).toBeDefined();
    });

    it('should create usage record with only required fields', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'test-tool',
        success: true,
      });

      expect(usage.executionId).toBe(executionId);
      expect(usage.toolName).toBe('test-tool');
      expect(usage.success).toBe(true);
      expect(usage.arguments).toBeNull();
      expect(usage.result).toBeNull();
      expect(usage.durationMs).toBeNull();
    });

    it('should create usage record with failure', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'failing-tool',
        arguments: { input: 'invalid' },
        success: false,
        errorMessage: 'Invalid input provided',
        durationMs: 50,
      });

      expect(usage.success).toBe(false);
      expect(usage.errorMessage).toBe('Invalid input provided');
      expect(usage.durationMs).toBe(50);
    });

    it('should handle large argument objects', async () => {
      const executionId = await createTestExecution();

      const largeArgs = {
        files: Array(100).fill(null).map((_, i) => `file${i}.txt`),
        options: {
          recursive: true,
          followSymlinks: true,
          includeHidden: true,
        },
      };

      const usage = await repository.create({
        executionId,
        toolName: 'scan-directory',
        arguments: largeArgs,
        success: true,
      });

      expect(usage.arguments).toEqual(largeArgs);
    });

    it('should handle special characters in result', async () => {
      const executionId = await createTestExecution();

      const result = 'Error: File contains "quotes" and \'apostrophes\' and \n newlines \t tabs';

      const usage = await repository.create({
        executionId,
        toolName: 'read-file',
        result,
        success: true,
      });

      expect(usage.result).toBe(result);
    });

    it('should handle very long result strings', async () => {
      const executionId = await createTestExecution();

      const longResult = 'x'.repeat(10000);

      const usage = await repository.create({
        executionId,
        toolName: 'generate-output',
        result: longResult,
        success: true,
      });

      expect(usage.result).toHaveLength(10000);
    });

    it('should handle null and undefined optional fields', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'simple-tool',
        arguments: null,
        result: undefined,
        durationMs: null,
        success: true,
        errorMessage: null,
      });

      expect(usage.arguments).toBeNull();
      expect(usage.result).toBeNull();
      expect(usage.durationMs).toBeNull();
      expect(usage.errorMessage).toBeNull();
    });
  });

  describe('create with error handling', () => {
    it('should throw error for missing executionId', async () => {
      await expect(repository.create({
        executionId: undefined as any,
        toolName: 'test',
        success: true,
      })).rejects.toThrow();
    });

    it('should throw error for missing toolName', async () => {
      const executionId = await createTestExecution();

      await expect(repository.create({
        executionId,
        toolName: undefined as any,
        success: true,
      })).rejects.toThrow();
    });

    it('should throw error for missing success flag', async () => {
      const executionId = await createTestExecution();

      await expect(repository.create({
        executionId,
        toolName: 'test',
        success: undefined as any,
      })).rejects.toThrow();
    });
  });

  describe('inherited CRUD operations', () => {
    it('should support exists', async () => {
      const executionId = await createTestExecution();
      const created = await repository.create({
        executionId,
        toolName: 'test-tool',
        success: true,
      });

      const exists = await repository.exists(created.id);
      const notExists = await repository.exists('non-existent-id');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should support count', async () => {
      const executionId = await createTestExecution();

      await repository.create({ executionId, toolName: 'tool-1', success: true });
      await repository.create({ executionId, toolName: 'tool-2', success: true });
      await repository.create({ executionId, toolName: 'tool-3', success: true });

      const count = await repository.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle unicode in tool name', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'read-file-',
        success: true,
      });

      expect(usage.toolName).toContain('read-file-');
    });

    it('should handle zero duration', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'instant-tool',
        durationMs: 0,
        success: true,
      });

      expect(usage.durationMs).toBe(0);
    });

    it('should handle very large duration values', async () => {
      const executionId = await createTestExecution();

      const usage = await repository.create({
        executionId,
        toolName: 'slow-tool',
        durationMs: 999999,
        success: true,
      });

      expect(usage.durationMs).toBe(999999);
    });
  });
});
