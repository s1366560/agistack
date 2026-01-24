/**
 * AI Provider Types Tests
 *
 * Tests for AI provider type definitions and schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  AIProviderType,
  AIProviderTypeSchema,
  ChatMessage,
  ChatMessageSchema,
  ChatRole,
  ChatRoleSchema,
  ToolCall,
  ToolCallSchema,
  StreamChunk,
  StreamChunkSchema,
  AIProviderConfig,
  AIProviderConfigSchema,
  CompletionOptions,
  CompletionOptionsSchema,
} from './ai-provider.types';

describe('AI Provider Types', () => {
  describe('AIProviderType', () => {
    it('should validate valid provider types', () => {
      expect(() => AIProviderTypeSchema.parse('anthropic')).not.toThrow();
      expect(() => AIProviderTypeSchema.parse('openai')).not.toThrow();
      expect(() => AIProviderTypeSchema.parse('google')).not.toThrow();
    });

    it('should reject invalid provider types', () => {
      expect(() => AIProviderTypeSchema.parse('invalid')).toThrow();
      expect(() => AIProviderTypeSchema.parse('')).toThrow();
    });
  });

  describe('ChatRole', () => {
    it('should validate valid chat roles', () => {
      expect(() => ChatRoleSchema.parse('user')).not.toThrow();
      expect(() => ChatRoleSchema.parse('assistant')).not.toThrow();
      expect(() => ChatRoleSchema.parse('system')).not.toThrow();
      expect(() => ChatRoleSchema.parse('tool')).not.toThrow();
    });

    it('should reject invalid chat roles', () => {
      expect(() => ChatRoleSchema.parse('admin')).toThrow();
      expect(() => ChatRoleSchema.parse('')).toThrow();
    });
  });

  describe('ChatMessage', () => {
    const validMessage: ChatMessage = {
      role: 'user',
      content: 'Hello, AI!',
    };

    it('should validate valid chat messages', () => {
      expect(() => ChatMessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should validate messages with tool calls', () => {
      const messageWithToolCall: ChatMessage = {
        role: 'assistant',
        content: 'I will help you',
        toolCalls: [
          {
            id: 'call_123',
            name: 'search',
            arguments: { query: 'test' },
          },
        ],
      };

      expect(() => ChatMessageSchema.parse(messageWithToolCall)).not.toThrow();
    });

    it('should validate tool response messages', () => {
      const toolMessage: ChatMessage = {
        role: 'tool',
        content: 'Result: success',
        toolCallId: 'call_123',
      };

      expect(() => ChatMessageSchema.parse(toolMessage)).not.toThrow();
    });

    it('should reject messages without required fields', () => {
      const invalidMessage = {
        role: 'user',
        // Missing content
      };

      expect(() => ChatMessageSchema.parse(invalidMessage)).toThrow();
    });

    it('should reject tool messages without toolCallId', () => {
      const toolMessageWithoutId: ChatMessage = {
        role: 'tool',
        content: 'Result',
      };

      expect(() => ChatMessageSchema.parse(toolMessageWithoutId)).toThrow();
    });
  });

  describe('ToolCall', () => {
    const validToolCall: ToolCall = {
      id: 'call_abc123',
      name: 'search_files',
      arguments: {
        path: '/src',
        pattern: '*.ts',
      },
    };

    it('should validate valid tool calls', () => {
      expect(() => ToolCallSchema.parse(validToolCall)).not.toThrow();
    });

    it('should reject tool calls without required fields', () => {
      const invalidCall = {
        id: 'call_123',
        // Missing name
      };

      expect(() => ToolCallSchema.parse(invalidCall)).toThrow();
    });

    it('should accept empty arguments', () => {
      const callWithEmptyArgs: ToolCall = {
        id: 'call_123',
        name: 'noop',
        arguments: {},
      };

      expect(() => ToolCallSchema.parse(callWithEmptyArgs)).not.toThrow();
    });
  });

  describe('StreamChunk', () => {
    const validChunk: StreamChunk = {
      content: 'Hello',
      done: false,
    };

    it('should validate valid stream chunks', () => {
      expect(() => StreamChunkSchema.parse(validChunk)).not.toThrow();
    });

    it('should validate final chunks', () => {
      const finalChunk: StreamChunk = {
        content: '',
        done: true,
      };

      expect(() => StreamChunkSchema.parse(finalChunk)).not.toThrow();
    });

    it('should validate chunks with tool calls', () => {
      const chunkWithTools: StreamChunk = {
        content: 'Thinking...',
        done: false,
        toolCalls: [
          {
            id: 'call_123',
            name: 'read_file',
            arguments: { path: 'test.ts' },
          },
        ],
      };

      expect(() => StreamChunkSchema.parse(chunkWithTools)).not.toThrow();
    });
  });

  describe('AIProviderConfig', () => {
    const validConfig: AIProviderConfig = {
      type: 'anthropic',
      apiKey: 'sk-ant-123',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
    };

    it('should validate valid provider configurations', () => {
      expect(() => AIProviderConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should validate OpenAI configuration', () => {
      const openaiConfig: AIProviderConfig = {
        type: 'openai',
        apiKey: 'sk-openai-123',
        model: 'gpt-4-turbo',
        maxTokens: 4096,
      };

      expect(() => AIProviderConfigSchema.parse(openaiConfig)).not.toThrow();
    });

    it('should validate configuration with baseURL', () => {
      const configWithBaseURL: AIProviderConfig = {
        type: 'openai',
        apiKey: 'sk-123',
        model: 'gpt-4',
        baseURL: 'https://api.openai.com/v1',
      };

      expect(() => AIProviderConfigSchema.parse(configWithBaseURL)).not.toThrow();
    });

    it('should reject configuration without API key', () => {
      const invalidConfig = {
        type: 'anthropic' as AIProviderType,
        model: 'claude-3-5-sonnet-20241022',
        // Missing apiKey
      };

      expect(() => AIProviderConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject configuration with invalid temperature', () => {
      const invalidConfig: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-123',
        model: 'claude-3',
        temperature: 2.5, // Must be between 0 and 2
      };

      expect(() => AIProviderConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject configuration with negative maxTokens', () => {
      const invalidConfig: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-123',
        model: 'claude-3',
        maxTokens: -100,
      };

      expect(() => AIProviderConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('CompletionOptions', () => {
    const validOptions: CompletionOptions = {
      maxTokens: 2048,
      temperature: 0.5,
      stream: true,
      tools: [
        {
          name: 'search',
          description: 'Search files',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
          },
        },
      ],
    };

    it('should validate valid completion options', () => {
      expect(() => CompletionOptionsSchema.parse(validOptions)).not.toThrow();
    });

    it('should validate options without tools', () => {
      const optionsWithoutTools: CompletionOptions = {
        maxTokens: 1024,
        stream: false,
      };

      expect(() => CompletionOptionsSchema.parse(optionsWithoutTools)).not.toThrow();
    });

    it('should validate options with tool choice', () => {
      const optionsWithToolChoice: CompletionOptions = {
        maxTokens: 1024,
        tools: [
          {
            name: 'calculator',
            description: 'Calculate',
            inputSchema: {
              type: 'object',
              properties: {
                expression: { type: 'string' },
              },
            },
          },
        ],
        toolChoice: {
          type: 'specific',
          name: 'calculator',
        },
      };

      expect(() => CompletionOptionsSchema.parse(optionsWithToolChoice)).not.toThrow();
    });

    it('should validate tool choice "auto" mode', () => {
      const options: CompletionOptions = {
        maxTokens: 1024,
        tools: [
          {
            name: 'test',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
        toolChoice: { type: 'auto' },
      };

      expect(() => CompletionOptionsSchema.parse(options)).not.toThrow();
    });

    it('should validate tool choice "required" mode', () => {
      const options: CompletionOptions = {
        maxTokens: 1024,
        tools: [
          {
            name: 'test',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
        toolChoice: { type: 'required' },
      };

      expect(() => CompletionOptionsSchema.parse(options)).not.toThrow();
    });

    it('should reject tool choice with non-existent tool', () => {
      const options: CompletionOptions = {
        maxTokens: 1024,
        tools: [
          {
            name: 'search',
            description: 'Search',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
        toolChoice: {
          type: 'specific',
          name: 'nonexistent', // Tool not in tools array
        },
      };

      expect(() => CompletionOptionsSchema.parse(options)).toThrow();
    });

    it('should reject tool choice without tools', () => {
      const options: CompletionOptions = {
        maxTokens: 1024,
        // No tools provided
        toolChoice: { type: 'required' },
      };

      expect(() => CompletionOptionsSchema.parse(options)).toThrow();
    });
  });
});
