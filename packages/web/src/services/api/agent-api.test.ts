/**
 * Agent API Client Tests
 *
 * Tests for agent API client with SSE streaming support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentApi } from './agent-api';
import type { AgentType } from './agent-api.types';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AgentApi', () => {
  let api: AgentApi;
  const mockBaseUrl = 'http://localhost:3001/api';
  const mockAuthToken = 'test-auth-token';

  beforeEach(() => {
    api = new AgentApi(mockBaseUrl, mockAuthToken);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe('executeAgent()', () => {
    it('should execute agent and return response', async () => {
      const requestBody = {
        agentType: 'general' as AgentType,
        messages: [
          { role: 'user', content: 'Hello, agent!' },
        ],
        config: {
          type: 'general' as AgentType,
          state: 'idle',
          capabilities: {
            canReadFiles: true,
            canWriteFiles: false,
            canExecuteCommands: false,
            canSearchCode: true,
            canUseLSP: false,
            canUseMCP: false,
          },
          permissions: [],
        },
      };

      const mockResponse = {
        executionId: 'exec_123',
        content: 'Hello! How can I help you?',
        toolCalls: undefined,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        state: 'completed',
        model: 'claude-3-5-sonnet-20241022',
        steps: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.executeAgent(requestBody);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('/api/agents/execute');
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    });

    it('should include auth token in request', async () => {
      const requestBody = {
        agentType: 'general' as AgentType,
        messages: [{ role: 'user', content: 'Test' }],
        config: {
          type: 'general' as AgentType,
          state: 'idle',
          capabilities: {
            canReadFiles: true,
            canWriteFiles: false,
            canExecuteCommands: false,
            canSearchCode: true,
            canUseLSP: false,
            canUseMCP: false,
          },
          permissions: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      await api.executeAgent(requestBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const authHeader = mockFetch.mock.calls[0][1].headers?.['Authorization'];
      expect(authHeader).toBe(`Bearer ${mockAuthToken}`);
    });

    it('should handle API errors', async () => {
      const requestBody = {
        agentType: 'general' as AgentType,
        messages: [{ role: 'user', content: 'Test' }],
        config: {
          type: 'general' as AgentType,
          state: 'idle',
          capabilities: {
            canReadFiles: true,
            canWriteFiles: false,
            canExecuteCommands: false,
            canSearchCode: true,
            canUseLSP: false,
            canUseMCP: false,
          },
          permissions: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Internal server error' }),
      } as Response);

      await expect(api.executeAgent(requestBody)).rejects.toThrow('Internal server error');
    });
  });

  describe('streamAgent()', () => {
    it('should stream agent responses via SSE', async () => {
      const agentType = 'general' as AgentType;
      const message = 'Tell me a story';

      // Create mock SSE stream
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          controller.enqueue(encoder.encode('event: message\n'));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            executionId: 'exec_123',
            content: 'Once ',
            done: false,
            state: 'executing',
          })}\n\n`));

          controller.enqueue(encoder.encode('event: message\n'));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            executionId: 'exec_123',
            content: 'upon ',
            done: false,
            state: 'executing',
          })}\n\n`));

          controller.enqueue(encoder.encode('event: message\n'));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            executionId: 'exec_123',
            content: 'a time',
            done: false,
            state: 'executing',
          })}\n\n`));

          controller.enqueue(encoder.encode('event: completed\n'));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            executionId: 'exec_123',
            done: true,
          })}\n\n`));

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: any[] = [];
      for await (const chunk of api.streamAgent(agentType, message)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0].content).toBe('Once ');
      expect(chunks[1].content).toBe('upon ');
      expect(chunks[2].content).toBe('a time');
      expect(chunks[3].done).toBe(true);
    });

    it('should handle tool calls in stream', async () => {
      const agentType = 'build' as AgentType;
      const message = 'Read a file';

      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          controller.enqueue(encoder.encode('event: message\n'));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            content: 'I will read the file',
            done: false,
            toolCalls: [
              {
                id: 'call_123',
                name: 'read_file',
                arguments: { path: 'test.txt' },
              },
            ],
          })}\n\n`));

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: any[] = [];
      for await (const chunk of api.streamAgent(agentType, message)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].toolCalls).toBeDefined();
      expect(chunks[0].toolCalls).toHaveLength(1);
      expect(chunks[0].toolCalls[0].name).toBe('read_file');
    });

    it('should handle stream errors', async () => {
      const agentType = 'general' as AgentType;
      const message = 'Test error';

      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('event: error\n'));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: 'Connection lost',
          })}\n\n`));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: any[] = [];
      for await (const chunk of api.streamAgent(agentType, message)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].error).toBeDefined();
      expect(chunks[0].error).toContain('Connection lost');
    });
  });

  describe('getTools()', () => {
    it('should list available tools', async () => {
      const mockTools = [
        {
          name: 'read_file',
          description: 'Read a file',
          category: 'file',
          dangerous: false,
        },
        {
          name: 'write_file',
          description: 'Write a file',
          category: 'file',
          dangerous: true,
        },
      ];

      const mockMeta = {
        total: 2,
        filteredBy: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools, meta: mockMeta }),
      } as Response);

      const result = await api.getTools();

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe('read_file');
      expect(result.tools[1].dangerous).toBe(true);
    });

    it('should support filtering by category', async () => {
      const mockTools = [
        {
          name: 'read_file',
          description: 'Read a file',
          category: 'file',
          dangerous: false,
        },
      ];

      const mockMeta = { total: 1, filteredBy: { category: 'file' } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools, meta: mockMeta }),
      } as Response);

      const result = await api.getTools({ category: 'file' });

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].category).toBe('file');
    });

    it('should support filtering dangerous tools', async () => {
      const mockTools = [
        {
          name: 'search_code',
          description: 'Search code',
          category: 'search',
          dangerous: false,
        },
      ];

      const mockMeta = { total: 1, filteredBy: { dangerous: false } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools, meta: mockMeta }),
      } as Response);

      const result = await api.getTools({ dangerous: false });

      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].dangerous).toBe(false);
    });
  });

  describe('getExecutions()', () => {
    it('should list agent executions', async () => {
      const mockExecutions = [
        {
          id: 'exec_1',
          sessionId: 'session_1',
          agentType: 'general',
          state: 'completed',
          inputPrompt: 'Test prompt',
          startedAt: '2025-01-24T10:00:00Z',
          completedAt: '2025-01-24T10:01:00Z',
        },
      ];

      const mockMeta = {
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ executions: mockExecutions, meta: mockMeta }),
      } as Response);

      const result = await api.getExecutions();

      expect(result.executions).toHaveLength(1);
      expect(result.executions[0].id).toBe('exec_1');
      expect(result.meta.total).toBe(1);
    });

    it('should support pagination parameters', async () => {
      const mockExecutions: any[] = [];

      const mockMeta = {
        total: 100,
        limit: 10,
        offset: 20,
        hasMore: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ executions: mockExecutions, meta: mockMeta }),
      } as Response);

      const result = await api.getExecutions({ limit: 10, offset: 20 });

      expect(result.meta.limit).toBe(10);
      expect(result.meta.offset).toBe(20);
      expect(result.meta.hasMore).toBe(true);
    });
  });

  describe('getExecutionDetails()', () => {
    it('should get execution details', async () => {
      const executionId = 'exec_123';

      const mockExecution = {
        id: executionId,
        agentType: 'general',
        state: 'completed',
        inputPrompt: 'Test prompt',
        outputSummary: 'Test summary',
        startedAt: '2025-01-24T10:00:00Z',
        completedAt: '2025-01-24T10:01:00Z',
      };

      const mockSteps = [
        {
          type: 'thinking',
          description: 'Agent is thinking',
          timestamp: '2025-01-24T10:00:01Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ execution: mockExecution, steps: mockSteps }),
      } as Response);

      const result = await api.getExecutionDetails(executionId);

      expect(result.execution.id).toBe(executionId);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].type).toBe('thinking');
    });

    it('should return null for non-existent execution', async () => {
      const executionId = 'nonexistent_exec';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Not found' }),
      } as Response);

      await expect(api.getExecutionDetails(executionId)).rejects.toThrow('Not found');
    });
  });

  describe('cancelExecution()', () => {
    it('should cancel running execution', async () => {
      const executionId = 'exec_running';

      const mockData = {
        message: 'Execution cancelled',
        executionId,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await api.cancelExecution(executionId);

      expect(result.message).toContain('cancelled');
      expect(result.executionId).toBe(executionId);
    });

    it('should handle cancellation errors', async () => {
      const executionId = 'exec_error';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Failed to cancel' }),
      } as Response);

      await expect(api.cancelExecution(executionId)).rejects.toThrow('Failed to cancel');
    });
  });
});
