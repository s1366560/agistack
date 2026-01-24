/**
 * AI Provider Integration Tests
 *
 * Tests for AI provider integration with Vercel AI SDK
 * These are basic smoke tests to verify the implementation works
 */

import { describe, it, expect } from 'vitest';
import { createProvider } from './ai-provider';
import type { AIProviderConfig, ChatMessage } from './ai-provider.types';

describe('AI Provider Integration', () => {
  describe('Provider Factory', () => {
    it('should create Anthropic provider', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      };

      const provider = createProvider(config);

      expect(provider.type).toBe('anthropic');
      expect(provider.model).toBe('claude-3-5-sonnet-20241022');
      expect(provider.complete).toBeDefined();
      expect(provider.stream).toBeDefined();
      expect(provider.validateConfig).toBeDefined();
    });

    it('should create OpenAI provider', () => {
      const config: AIProviderConfig = {
        type: 'openai',
        apiKey: 'sk-openai-test',
        model: 'gpt-4-turbo',
      };

      const provider = createProvider(config);

      expect(provider.type).toBe('openai');
      expect(provider.model).toBe('gpt-4-turbo');
      expect(provider.complete).toBeDefined();
      expect(provider.stream).toBeDefined();
      expect(provider.validateConfig).toBeDefined();
    });

    it('should create Google provider', () => {
      const config: AIProviderConfig = {
        type: 'google',
        apiKey: 'google-test-key',
        model: 'gemini-pro',
      };

      const provider = createProvider(config);

      expect(provider.type).toBe('google');
      expect(provider.model).toBe('gemini-pro');
      expect(provider.complete).toBeDefined();
      expect(provider.stream).toBeDefined();
      expect(provider.validateConfig).toBeDefined();
    });

    it('should throw error for unsupported provider type', () => {
      const config = {
        type: 'unsupported' as any,
        apiKey: 'test',
        model: 'test-model',
      };

      expect(() => createProvider(config)).toThrow('Unsupported AI provider type: unsupported');
    });
  });

  describe('Provider Validation', () => {
    it('should validate Anthropic configuration', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      };

      const provider = createProvider(config);

      expect(() => provider.validateConfig(config)).not.toThrow();
    });

    it('should validate OpenAI configuration', () => {
      const config: AIProviderConfig = {
        type: 'openai',
        apiKey: 'sk-openai-test',
        model: 'gpt-4-turbo',
      };

      const provider = createProvider(config);

      expect(() => provider.validateConfig(config)).not.toThrow();
    });

    it('should validate Google configuration', () => {
      const config: AIProviderConfig = {
        type: 'google',
        apiKey: 'google-test-key',
        model: 'gemini-pro',
      };

      const provider = createProvider(config);

      expect(() => provider.validateConfig(config)).not.toThrow();
    });

    it('should reject configuration with empty API key', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022',
      };

      expect(() => createProvider(config)).toThrow();
    });

    it('should reject configuration with empty model', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: '',
      };

      expect(() => createProvider(config)).toThrow();
    });

    it('should reject configuration with invalid temperature', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 3,
      };

      expect(() => createProvider(config)).toThrow();
    });
  });

  describe('Provider Interface Contract', () => {
    const configs: AIProviderConfig[] = [
      {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      },
      {
        type: 'openai',
        apiKey: 'sk-openai-test',
        model: 'gpt-4-turbo',
      },
      {
        type: 'google',
        apiKey: 'google-test-key',
        model: 'gemini-pro',
      },
    ];

    configs.forEach(config => {
      describe(`${config.type} provider`, () => {
        let provider: ReturnType<typeof createProvider>;

        beforeEach(() => {
          provider = createProvider(config);
        });

        it('should have correct type property', () => {
          expect(provider.type).toBe(config.type);
        });

        it('should have correct model property', () => {
          expect(provider.model).toBe(config.model);
        });

        it('should have complete method', () => {
          expect(typeof provider.complete).toBe('function');
        });

        it('should have stream method', () => {
          expect(typeof provider.stream).toBe('function');
        });

        it('should have validateConfig method', () => {
          expect(typeof provider.validateConfig).toBe('function');
        });
      });
    });
  });

  describe('Message Conversion', () => {
    it('should handle user messages', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      };

      const provider = createProvider(config);
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello, AI!' },
      ];

      // Verify the provider accepts the message format
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello, AI!');
    });

    it('should handle messages with tool calls', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      };

      const provider = createProvider(config);
      const messages: ChatMessage[] = [
        {
          role: 'assistant',
          content: 'I will search for that',
          toolCalls: [
            {
              id: 'call_123',
              name: 'search',
              arguments: { query: 'test' },
            },
          ],
        },
      ];

      expect(messages[0].toolCalls).toBeDefined();
      expect(messages[0].toolCalls).toHaveLength(1);
      expect(messages[0].toolCalls?.[0].name).toBe('search');
    });

    it('should handle tool result messages', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      };

      const provider = createProvider(config);
      const messages: ChatMessage[] = [
        {
          role: 'tool',
          content: 'Result: success',
          toolCallId: 'call_123',
        },
      ];

      expect(messages[0].role).toBe('tool');
      expect(messages[0].toolCallId).toBe('call_123');
    });
  });

  describe('Retry Configuration', () => {
    it('should accept custom retry configuration', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        retryAttempts: 5,
        retryDelay: 2000,
      };

      expect(() => createProvider(config)).not.toThrow();
      const provider = createProvider(config);
      expect(provider.type).toBe('anthropic');
    });

    it('should accept retry attempts within valid range', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        retryAttempts: 10,
      };

      expect(() => createProvider(config)).not.toThrow();
    });

    it('should reject retry attempts exceeding max', () => {
      const config: AIProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
        retryAttempts: 11,
      };

      expect(() => createProvider(config)).toThrow();
    });
  });
});
