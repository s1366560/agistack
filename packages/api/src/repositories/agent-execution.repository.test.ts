/**
 * Tests for AgentExecutionRepository
 *
 * TDD: Tests written before implementation
 * RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentExecutionRepository } from './agent-execution.repository';
import { agentExecutions } from '../db/schema';
import { getTestDatabase, cleanTestDatabase, createTestUser, createTestWorkspace, createTestProject, createTestSession } from '../../__tests__/helpers/integration';

describe('AgentExecutionRepository', () => {
  let repository: AgentExecutionRepository;
  let db: ReturnType<typeof getTestDatabase>;

  beforeEach(async () => {
    db = getTestDatabase();
    await cleanTestDatabase(db);
    repository = new AgentExecutionRepository();
  });

  // Helper to create test execution
  async function createTestExecutionData() {
    const user = await createTestUser(db);
    const workspace = await createTestWorkspace(db, user.id);
    const project = await createTestProject(db, workspace.id);
    const session = await createTestSession(db, project.id);

    return {
      sessionId: session.id,
      agentType: 'build' as const,
      state: 'idle' as const,
      inputPrompt: 'Test prompt',
    };
  }

  describe('create', () => {
    it('should create a new agent execution', async () => {
      const data = await createTestExecutionData();

      const execution = await repository.create(data);

      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();
      expect(execution.sessionId).toBe(data.sessionId);
      expect(execution.agentType).toBe(data.agentType);
      expect(execution.state).toBe(data.state);
      expect(execution.inputPrompt).toBe(data.inputPrompt);
      expect(execution.steps).toEqual([]);
      expect(execution.createdAt).toBeDefined();
      expect(execution.updatedAt).toBeDefined();
    });

    it('should create execution with initial state as idle', async () => {
      const data = await createTestExecutionData();

      const execution = await repository.create(data);

      expect(execution.state).toBe('idle');
      expect(execution.startedAt).toBeDefined();
    });
  });

  describe('updateState', () => {
    it('should update execution state', async () => {
      const data = await createTestExecutionData();
      const execution = await repository.create(data);

      const updated = await repository.updateState(execution.id, 'thinking');

      expect(updated).toBeDefined();
      expect(updated?.state).toBe('thinking');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should return null if execution not found', async () => {
      const result = await repository.updateState('non-existent-id', 'thinking');

      expect(result).toBeNull();
    });

    it('should support all state transitions', async () => {
      const data = await createTestExecutionData();
      const execution = await repository.create(data);

      const states: Array<'idle' | 'thinking' | 'planning' | 'executing' | 'waiting' | 'completed' | 'error'> = [
        'idle',
        'thinking',
        'planning',
        'executing',
        'waiting',
        'completed',
      ];

      let currentExecution = execution;
      for (const state of states) {
        currentExecution = await repository.updateState(currentExecution.id, state) as any;
        expect(currentExecution.state).toBe(state);
      }
    });
  });

  describe('addStep', () => {
    it('should add a step to execution', async () => {
      const data = await createTestExecutionData();
      const execution = await repository.create(data);

      const step = {
        type: 'tool_call',
        description: 'Reading file',
        timestamp: new Date().toISOString(),
        metadata: { tool: 'read-file', path: '/test.txt' },
      };

      const updated = await repository.addStep(execution.id, step);

      expect(updated).toBeDefined();
      expect(updated?.steps).toHaveLength(1);
      expect(updated?.steps[0]).toMatchObject(step);
    });

    it('should append steps to existing steps', async () => {
      const data = await createTestExecutionData();
      const execution = await repository.create(data);

      const step1 = {
        type: 'tool_call',
        description: 'Reading file',
        timestamp: new Date().toISOString(),
      };

      const step2 = {
        type: 'tool_result',
        description: 'File content',
        timestamp: new Date().toISOString(),
      };

      await repository.addStep(execution.id, step1);
      const updated = await repository.addStep(execution.id, step2);

      expect(updated?.steps).toHaveLength(2);
      expect(updated?.steps[0].description).toBe('Reading file');
      expect(updated?.steps[1].description).toBe('File content');
    });

    it('should return null if execution not found', async () => {
      const result = await repository.addStep('non-existent-id', {
        type: 'test',
        description: 'Test',
        timestamp: new Date().toISOString(),
      });

      expect(result).toBeNull();
    });
  });

  describe('complete', () => {
    it('should mark execution as completed', async () => {
      const data = await createTestExecutionData();
      const execution = await repository.create(data);

      const completionData = {
        outputSummary: 'Task completed successfully',
        tokensUsed: { input: 100, output: 50, total: 150 },
        durationMs: 5000,
      };

      const completed = await repository.complete(execution.id, completionData);

      expect(completed).toBeDefined();
      expect(completed?.state).toBe('completed');
      expect(completed?.outputSummary).toBe(completionData.outputSummary);
      expect(completed?.tokensUsed).toEqual(completionData.tokensUsed);
      expect(completed?.durationMs).toBe(completionData.durationMs);
      expect(completed?.completedAt).toBeDefined();
    });

    it('should return null if execution not found', async () => {
      const result = await repository.complete('non-existent-id', {
        outputSummary: 'Done',
      });

      expect(result).toBeNull();
    });
  });

  describe('fail', () => {
    it('should mark execution as failed', async () => {
      const data = await createTestExecutionData();
      const execution = await repository.create(data);

      const errorMessage = 'Tool execution failed: permission denied';

      const failed = await repository.fail(execution.id, errorMessage);

      expect(failed).toBeDefined();
      expect(failed?.state).toBe('error');
      expect(failed?.errorMessage).toBe(errorMessage);
      expect(failed?.completedAt).toBeDefined();
    });

    it('should return null if execution not found', async () => {
      const result = await repository.fail('non-existent-id', 'Error');

      expect(result).toBeNull();
    });
  });

  describe('findBySession', () => {
    it('should return all executions for a session', async () => {
      const data = await createTestExecutionData();

      const execution1 = await repository.create({ ...data, inputPrompt: 'Task 1' });
      const execution2 = await repository.create({ ...data, inputPrompt: 'Task 2' });
      const execution3 = await repository.create({ ...data, inputPrompt: 'Task 3' });

      const executions = await repository.findBySession(data.sessionId);

      expect(executions).toHaveLength(3);
      expect(executions.map((e) => e.id)).toContain(execution1.id);
      expect(executions.map((e) => e.id)).toContain(execution2.id);
      expect(executions.map((e) => e.id)).toContain(execution3.id);
    });

    it('should return empty array if no executions exist', async () => {
      const executions = await repository.findBySession('non-existent-session-id');

      expect(executions).toEqual([]);
    });

    it('should order by startedAt descending', async () => {
      const data = await createTestExecutionData();

      await repository.create({ ...data, inputPrompt: 'First' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.create({ ...data, inputPrompt: 'Second' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.create({ ...data, inputPrompt: 'Third' });

      const executions = await repository.findBySession(data.sessionId);

      expect(executions[0].inputPrompt).toBe('Third');
      expect(executions[1].inputPrompt).toBe('Second');
      expect(executions[2].inputPrompt).toBe('First');
    });
  });

  describe('findActive', () => {
    it('should return execution with non-completed state', async () => {
      const data = await createTestExecutionData();

      const execution = await repository.create(data);
      await repository.updateState(execution.id, 'thinking');

      const active = await repository.findActive(data.sessionId);

      expect(active).toBeDefined();
      expect(active?.id).toBe(execution.id);
      expect(active?.state).toBe('thinking');
    });

    it('should return null if all executions are completed', async () => {
      const data = await createTestExecutionData();

      const execution = await repository.create(data);
      await repository.complete(execution.id, { outputSummary: 'Done' });

      const active = await repository.findActive(data.sessionId);

      expect(active).toBeNull();
    });

    it('should return null if no executions exist', async () => {
      const active = await repository.findActive('non-existent-session-id');

      expect(active).toBeNull();
    });

    it('should consider error state as inactive', async () => {
      const data = await createTestExecutionData();

      const execution = await repository.create(data);
      await repository.fail(execution.id, 'Error occurred');

      const active = await repository.findActive(data.sessionId);

      expect(active).toBeNull();
    });

    it('should return the most recent active execution', async () => {
      const data = await createTestExecutionData();

      const execution1 = await repository.create(data);
      await repository.updateState(execution1.id, 'thinking');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const execution2 = await repository.create(data);
      await repository.updateState(execution2.id, 'executing');

      const active = await repository.findActive(data.sessionId);

      expect(active?.id).toBe(execution2.id);
    });
  });

  describe('inherited CRUD operations', () => {
    it('should support findById', async () => {
      const data = await createTestExecutionData();
      const created = await repository.create(data);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should support delete', async () => {
      const data = await createTestExecutionData();
      const created = await repository.create(data);

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should support count', async () => {
      const data = await createTestExecutionData();

      await repository.create(data);
      await repository.create(data);
      await repository.create(data);

      const count = await repository.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});
