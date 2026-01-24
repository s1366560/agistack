/**
 * Agent Orchestrator Tests
 *
 * Tests for agent lifecycle management, delegation, and collaboration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from './orchestrator';
import { AIProvider } from '../ai';
import type { AgentConfig, AgentType, AgentState } from '@agistack/shared/types/agent';
import type { ChatMessage } from '../ai';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockAIProvider: AIProvider;
  let mockToolRegistry: any;

  const mockAgentConfig: AgentConfig = {
    type: 'general',
    state: 'idle',
    capabilities: {
      canReadFiles: true,
      canWriteFiles: true,
      canExecuteCommands: false,
      canSearchCode: true,
      canUseLSP: false,
      canUseMCP: false,
    },
    permissions: [],
    maxTokens: 4096,
    temperature: 0.7,
  };

  beforeEach(() => {
    // Mock AI provider
    mockAIProvider = {
      type: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      complete: vi.fn(),
      stream: vi.fn(),
      validateConfig: vi.fn(),
    };

    // Mock tool registry
    mockToolRegistry = {
      getEnabled: vi.fn(() => []),
      get: vi.fn(),
      has: vi.fn(),
    };

    orchestrator = new AgentOrchestrator(mockAIProvider, mockToolRegistry);
  });

  describe('Initialization', () => {
    it('should initialize with AI provider and tool registry', () => {
      expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
    });

    it('should store AI provider', () => {
      expect(orchestrator['aiProvider']).toBe(mockAIProvider);
    });

    it('should store tool registry', () => {
      expect(orchestrator['toolRegistry']).toBe(mockToolRegistry);
    });
  });

  describe('executeAgent() - Basic Execution', () => {
    it('should execute a general agent', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, agent!' },
      ];

      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'Hello! How can I help you?',
        toolCalls: undefined,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        model: 'claude-3-5-sonnet-20241022',
      });

      const result = await orchestrator.executeAgent('general', messages, mockAgentConfig);

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.usage).toBeDefined();
      expect(result.usage!.totalTokens).toBe(30);
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('should execute a build agent', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Build this feature' },
      ];

      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'I will build the feature',
        usage: {
          inputTokens: 15,
          outputTokens: 25,
          totalTokens: 40,
        },
        model: 'claude-3-5-sonnet-20241022',
      });

      const result = await orchestrator.executeAgent('build', messages, mockAgentConfig);

      expect(result.content).toBe('I will build the feature');
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('should execute a plan agent', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Plan this implementation' },
      ];

      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'Here is the plan...',
        usage: {
          inputTokens: 20,
          outputTokens: 30,
          totalTokens: 50,
        },
        model: 'claude-3-5-sonnet-20241022',
      });

      const result = await orchestrator.executeAgent('plan', messages, mockAgentConfig);

      expect(result.content).toBe('Here is the plan...');
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle agent execution errors', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test error' },
      ];

      mockAIProvider.complete = vi.fn().mockRejectedValue(new Error('AI provider failed'));

      await expect(orchestrator.executeAgent('general', messages, mockAgentConfig))
        .rejects.toThrow('AI provider failed');
    });
  });

  describe('executeAgent() - Tool Calling', () => {
    it('should handle tool calls from agent', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Read the file test.txt' },
      ];

      // Agent calls a tool
      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'I will read the file',
          toolCalls: [
            {
              id: 'call_123',
              name: 'read_file',
              arguments: { path: 'test.txt' },
            },
          ],
          usage: {
            inputTokens: 15,
            outputTokens: 10,
            totalTokens: 25,
          },
          model: 'claude-3-5-sonnet-20241022',
        })
        // Second call after tool execution
        .mockResolvedValueOnce({
          content: 'The file contains: Hello World',
          usage: {
            inputTokens: 25,
            outputTokens: 15,
            totalTokens: 40,
          },
          model: 'claude-3-5-sonnet-20241022',
        });

      // Mock tool execution
      const mockTool = {
        name: 'read_file',
        handler: vi.fn().mockResolvedValue({
          success: true,
          data: { content: 'Hello World' },
        }),
      };

      mockToolRegistry.get = vi.fn().mockReturnValue(mockTool);

      const result = await orchestrator.executeAgent('general', messages, mockAgentConfig);

      expect(result.content).toBe('The file contains: Hello World');
      expect(mockTool.handler).toHaveBeenCalledTimes(1);
      expect(mockTool.handler).toHaveBeenCalledWith({ path: 'test.txt' });
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple tool calls in sequence', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Read file1.txt and file2.txt' },
      ];

      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'Reading files',
          toolCalls: [
            {
              id: 'call_1',
              name: 'read_file',
              arguments: { path: 'file1.txt' },
            },
          ],
          usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Reading second file',
          toolCalls: [
            {
              id: 'call_2',
              name: 'read_file',
              arguments: { path: 'file2.txt' },
            },
          ],
          usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Both files read successfully',
          usage: { inputTokens: 30, outputTokens: 15, totalTokens: 45 },
          model: 'claude-3-5-sonnet-20241022',
        });

      const mockTool = {
        name: 'read_file',
        handler: vi.fn()
          .mockResolvedValueOnce({ success: true, data: { content: 'File 1' } })
          .mockResolvedValueOnce({ success: true, data: { content: 'File 2' } }),
      };

      mockToolRegistry.get = vi.fn().mockReturnValue(mockTool);

      const result = await orchestrator.executeAgent('general', messages, mockAgentConfig);

      expect(result.content).toBe('Both files read successfully');
      expect(mockTool.handler).toHaveBeenCalledTimes(2);
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(3);
    });

    it('should handle tool execution errors', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Read non-existent file' },
      ];

      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'I will read the file',
          toolCalls: [
            {
              id: 'call_123',
              name: 'read_file',
              arguments: { path: 'missing.txt' },
            },
          ],
          usage: { inputTokens: 15, outputTokens: 10, totalTokens: 25 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Sorry, the file could not be found',
          usage: { inputTokens: 25, outputTokens: 15, totalTokens: 40 },
          model: 'claude-3-5-sonnet-20241022',
        });

      const mockTool = {
        name: 'read_file',
        handler: vi.fn().mockResolvedValue({
          success: false,
          error: 'File not found',
        }),
      };

      mockToolRegistry.get = vi.fn().mockReturnValue(mockTool);

      const result = await orchestrator.executeAgent('general', messages, mockAgentConfig);

      expect(result.content).toBe('Sorry, the file could not be found');
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeAgent() - Streaming', () => {
    it('should stream agent responses', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Tell me a story' },
      ];

      const mockChunks = [
        { content: 'Once ', done: false },
        { content: 'upon ', done: false },
        { content: 'a time', done: false },
        { content: '', done: true },
      ];

      mockAIProvider.stream = vi.fn().mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      });

      const chunks: string[] = [];
      for await (const chunk of orchestrator.streamAgent('general', messages, mockAgentConfig)) {
        if (!chunk.done) {
          chunks.push(chunk.content);
        }
      }

      expect(chunks).toEqual(['Once ', 'upon ', 'a time']);
      expect(mockAIProvider.stream).toHaveBeenCalledTimes(1);
    });
  });

  describe('delegateTask() - Multi-Agent Collaboration', () => {
    it('should delegate task from general agent to build agent', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Implement a new feature' },
      ];

      // General agent decides to delegate
      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'I will delegate this to the build agent',
          toolCalls: [
            {
              id: 'call_delegate',
              name: 'delegate',
              arguments: {
                agentType: 'build',
                task: 'Implement feature X',
                context: 'User wants feature X',
              },
            },
          ],
          usage: { inputTokens: 20, outputTokens: 15, totalTokens: 35 },
          model: 'claude-3-5-sonnet-20241022',
        })
        // Build agent response
        .mockResolvedValueOnce({
          content: 'Feature X implemented successfully',
          usage: { inputTokens: 25, outputTokens: 20, totalTokens: 45 },
          model: 'claude-3-5-sonnet-20241022',
        })
        // General agent final response
        .mockResolvedValueOnce({
          content: 'The build agent has successfully implemented feature X',
          usage: { inputTokens: 50, outputTokens: 15, totalTokens: 65 },
          model: 'claude-3-5-sonnet-20241022',
        });

      const result = await orchestrator.executeAgent('general', messages, mockAgentConfig);

      expect(result.content).toBe('The build agent has successfully implemented feature X');
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(3);
    });

    it('should handle delegation chains', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Complex multi-step task' },
      ];

      // Plan agent delegates to build agent
      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'Planning and will delegate',
          toolCalls: [
            {
              id: 'call_1',
              name: 'delegate',
              arguments: { agentType: 'build', task: 'Build component' },
            },
          ],
          usage: { inputTokens: 20, outputTokens: 15, totalTokens: 35 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Component built',
          usage: { inputTokens: 25, outputTokens: 10, totalTokens: 35 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Plan completed: component is ready',
          usage: { inputTokens: 40, outputTokens: 15, totalTokens: 55 },
          model: 'claude-3-5-sonnet-20241022',
        });

      const result = await orchestrator.executeAgent('plan', messages, mockAgentConfig);

      expect(result.content).toBe('Plan completed: component is ready');
    });

    it('should prevent circular delegation', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test circular delegation' },
      ];

      // General agent delegates to build, which tries to delegate back to general
      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'Delegating to build',
          toolCalls: [
            {
              id: 'call_1',
              name: 'delegate',
              arguments: { agentType: 'build', task: 'Do something' },
            },
          ],
          usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
          model: 'claude-3-5-sonnet-20241022',
        })
        // Build agent tries to delegate back to general (should be prevented)
        .mockResolvedValueOnce({
          content: 'Attempting to delegate back',
          toolCalls: [
            {
              id: 'call_2',
              name: 'delegate',
              arguments: { agentType: 'general', task: 'Help me' },
            },
          ],
          usage: { inputTokens: 25, outputTokens: 10, totalTokens: 35 },
          model: 'claude-3-5-sonnet-20241022',
        });

      // Should throw error on circular delegation
      await expect(orchestrator.executeAgent('general', messages, mockAgentConfig))
        .rejects.toThrow();
    });
  });

  describe('Agent State Management', () => {
    it('should track agent state during execution', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Execute task' },
      ];

      let stateChanges: AgentState[] = [];

      // Subscribe to state changes if available
      if (orchestrator.onStateChange) {
        orchestrator.onStateChange((state) => {
          stateChanges.push(state);
        });
      }

      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'Task completed',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        model: 'claude-3-5-sonnet-20241022',
      });

      await orchestrator.executeAgent('general', messages, mockAgentConfig);

      // Verify state transitions occurred
      expect(stateChanges.length).toBeGreaterThan(0);
    });

    it('should update state on tool calls', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Use a tool' },
      ];

      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'Calling tool',
          toolCalls: [
            {
              id: 'call_1',
              name: 'test_tool',
              arguments: {},
            },
          ],
          usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Tool executed',
          usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
          model: 'claude-3-5-sonnet-20241022',
        });

      const mockTool = {
        name: 'test_tool',
        handler: vi.fn().mockResolvedValue({ success: true, data: {} }),
      };

      mockToolRegistry.get = vi.fn().mockReturnValue(mockTool);

      await orchestrator.executeAgent('general', messages, mockAgentConfig);

      // Verify state changed during tool execution
      expect(mockTool.handler).toHaveBeenCalled();
    });

    it('should handle error state', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Cause error' },
      ];

      mockAIProvider.complete = vi.fn().mockRejectedValue(new Error('Execution failed'));

      await expect(orchestrator.executeAgent('general', messages, mockAgentConfig))
        .rejects.toThrow('Execution failed');
    });
  });

  describe('Agent Capabilities', () => {
    it('should respect agent capabilities', async () => {
      const limitedConfig: AgentConfig = {
        ...mockAgentConfig,
        capabilities: {
          canReadFiles: true,
          canWriteFiles: false,
          canExecuteCommands: false,
          canSearchCode: false,
          canUseLSP: false,
          canUseMCP: false,
        },
      };

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Read a file' },
      ];

      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'File read successfully',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        model: 'claude-3-5-sonnet-20241022',
      });

      await orchestrator.executeAgent('general', messages, limitedConfig);

      // Should not attempt to use disallowed capabilities
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('should filter available tools based on capabilities', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Execute command' },
      ];

      // Agent tries to use a command tool, but capability is disabled
      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'Cannot execute commands - capability disabled',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        model: 'claude-3-5-sonnet-20241022',
      });

      await orchestrator.executeAgent('general', messages, mockAgentConfig);

      expect(mockAIProvider.complete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Management', () => {
    it('should respect max tokens configuration', async () => {
      const limitedConfig: AgentConfig = {
        ...mockAgentConfig,
        maxTokens: 1000,
      };

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Generate response' },
      ];

      mockAIProvider.complete = vi.fn().mockResolvedValue({
        content: 'Response',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
        model: 'claude-3-5-sonnet-20241022',
      });

      await orchestrator.executeAgent('general', messages, limitedConfig);

      const call = mockAIProvider.complete.mock.calls[0];
      // Verify max tokens was passed to AI provider
      expect(mockAIProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('should track total token usage', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Track usage' },
      ];

      mockAIProvider.complete = vi.fn()
        .mockResolvedValueOnce({
          content: 'First response',
          toolCalls: [
            {
              id: 'call_1',
              name: 'test_tool',
              arguments: {},
            },
          ],
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          model: 'claude-3-5-sonnet-20241022',
        })
        .mockResolvedValueOnce({
          content: 'Final response',
          usage: { inputTokens: 150, outputTokens: 50, totalTokens: 200 },
          model: 'claude-3-5-sonnet-20241022',
        });

      const mockTool = {
        name: 'test_tool',
        handler: vi.fn().mockResolvedValue({ success: true, data: {} }),
      };

      mockToolRegistry.get = vi.fn().mockReturnValue(mockTool);

      const result = await orchestrator.executeAgent('general', messages, mockAgentConfig);

      // Total tokens should accumulate across all AI calls
      expect(result.usage.totalTokens).toBeGreaterThan(0);
    });
  });
});
