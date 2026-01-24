/**
 * AI Provider Service
 *
 * Abstraction layer for multiple AI providers using Vercel AI SDK
 * Supports Anthropic, OpenAI, and Google providers
 * Supports streaming responses, tool calling, and automatic retries
 */

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import {
  streamText,
  generateText,
  CoreMessage,
  CoreTool,
  LanguageModelV1,
} from 'ai';
import {
  AIProviderConfig,
  AIProviderConfigSchema,
  ChatMessage,
  ChatMessageSchema,
  CompletionOptions,
  CompletionResponse,
  CompletionResponseSchema,
  StreamChunk,
  StreamChunkSchema,
  ToolCall,
  Usage,
  UsageSchema,
} from './ai-provider.types';

/**
 * AI Provider Interface
 *
 * All providers must implement this interface
 */
export interface AIProvider {
  /** Provider type identifier */
  readonly type: string;

  /** Model identifier */
  readonly model: string;

  /**
   * Generate a completion (non-streaming)
   */
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse>;

  /**
   * Generate a streaming completion
   */
  stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<StreamChunk>;

  /**
   * Validate provider configuration
   */
  validateConfig(config: AIProviderConfig): void;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 4,
  initialDelay: 1000,
  maxDelay: 10000,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(config.initialDelay * Math.pow(2, attempt), config.maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporary') ||
      message.includes('service unavailable') ||
      message.includes('too many requests')
    );
  }
  return false;
}

/**
 * Execute function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-retryable errors (e.g., authentication)
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't delay on last attempt
      if (attempt < config.maxAttempts - 1) {
        const delay = calculateRetryDelay(attempt, config);
        console.warn(`Retry attempt ${attempt + 1}/${config.maxAttempts} after ${delay}ms`, {
          error: lastError.message,
        });
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Convert ChatMessage to Vercel AI SDK CoreMessage format
 */
function convertToCoreMessages(messages: ChatMessage[]): CoreMessage[] {
  return messages.map(msg => {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: [{ type: 'tool-result', toolCallId: msg.toolCallId!, content: msg.content }],
      };
    }

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: [
          { type: 'text', text: msg.content },
          ...msg.toolCalls.map(tc => ({
            type: 'tool-call' as const,
            toolCallId: tc.id,
            toolName: tc.name,
            args: tc.arguments,
          })),
        ],
      };
    }

    return {
      role: msg.role,
      content: msg.content,
    };
  });
}

/**
 * Convert CompletionOptions to Vercel AI SDK options
 */
function convertToVercelOptions(options?: CompletionOptions) {
  if (!options) return {};

  const vercelOptions: any = {};

  if (options.maxTokens) vercelOptions.maxTokens = options.maxTokens;
  if (options.temperature !== undefined) vercelOptions.temperature = options.temperature;
  if (options.topP !== undefined) vercelOptions.topP = options.topP;

  if (options.tools && options.tools.length > 0) {
    vercelOptions.tools = options.tools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        parameters: tool.inputSchema,
      };
      return acc;
    }, {} as Record<string, Omit<CoreTool, 'execute'>>);

    if (options.toolChoice) {
      if (options.toolChoice.type === 'auto') {
        vercelOptions.toolChoice = 'auto';
      } else if (options.toolChoice.type === 'required') {
        vercelOptions.toolChoice = 'required';
      } else if (options.toolChoice.type === 'specific') {
        vercelOptions.toolChoice = { type: 'tool', toolName: options.toolChoice.name };
      }
    }
  }

  if (options.stopSequences) {
    vercelOptions.stopSequences = options.stopSequences;
  }

  return vercelOptions;
}

/**
 * Anthropic Provider Implementation using Vercel AI SDK
 */
export class AnthropicProvider implements AIProvider {
  readonly type = 'anthropic';
  readonly model: string;
  private modelInstance: LanguageModelV1;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.validateConfig(config);
    this.config = config;

    this.modelInstance = anthropic(config.model, {
      apiKey: config.apiKey,
    });

    this.model = config.model;
  }

  validateConfig(config: AIProviderConfig): void {
    const result = AIProviderConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid Anthropic config: ${result.error.errors[0].message}`);
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    if (!config.model || config.model.trim() === '') {
      throw new Error('Model is required');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    return withRetry(async () => {
      const validationResult = ChatMessageSchema.array().safeParse(messages);
      if (!validationResult.success) {
        throw new Error(`Invalid messages: ${validationResult.error.errors[0].message}`);
      }

      const coreMessages = convertToCoreMessages(messages);
      const vercelOptions = convertToVercelOptions(options);

      const response = await generateText({
        model: this.modelInstance,
        messages: coreMessages,
        ...vercelOptions,
      });

      const toolCalls: ToolCall[] | undefined = response.toolCalls?.map(tc => ({
        id: tc.toolCallId,
        name: tc.toolName,
        arguments: tc.args,
      }));

      return {
        content: response.text,
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          totalTokens: response.usage.promptTokens + response.usage.completionTokens,
        },
        model: this.model,
      };
    }, {
      maxAttempts: this.config.retryAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
      initialDelay: this.config.retryDelay ?? DEFAULT_RETRY_CONFIG.initialDelay,
      maxDelay: DEFAULT_RETRY_CONFIG.maxDelay,
    });
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<StreamChunk> {
    const validationResult = ChatMessageSchema.array().safeParse(messages);
    if (!validationResult.success) {
      throw new Error(`Invalid messages: ${validationResult.error.errors[0].message}`);
    }

    const coreMessages = convertToCoreMessages(messages);
    const vercelOptions = convertToVercelOptions(options);

    const result = await streamText({
      model: this.modelInstance,
      messages: coreMessages,
      ...vercelOptions,
    });

    for await (const chunk of result.textStream) {
      yield {
        content: chunk,
        done: false,
      };
    }

    // Check if there are tool calls
    const response = await result;
    if (response.toolCalls && response.toolCalls.length > 0) {
      yield {
        content: '',
        done: false,
        toolCalls: response.toolCalls.map(tc => ({
          id: tc.toolCallId,
          name: tc.toolName,
          arguments: tc.args,
        })),
      };
    }

    yield {
      content: '',
      done: true,
    };
  }
}

/**
 * OpenAI Provider Implementation using Vercel AI SDK
 */
export class OpenAIProvider implements AIProvider {
  readonly type = 'openai';
  readonly model: string;
  private modelInstance: LanguageModelV1;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.validateConfig(config);
    this.config = config;

    const createOptions: any = {
      apiKey: config.apiKey,
    };

    if (config.baseURL) {
      createOptions.baseURL = config.baseURL;
    }

    this.modelInstance = openai(config.model, createOptions);
    this.model = config.model;
  }

  validateConfig(config: AIProviderConfig): void {
    const result = AIProviderConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid OpenAI config: ${result.error.errors[0].message}`);
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    if (!config.model || config.model.trim() === '') {
      throw new Error('Model is required');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    return withRetry(async () => {
      const validationResult = ChatMessageSchema.array().safeParse(messages);
      if (!validationResult.success) {
        throw new Error(`Invalid messages: ${validationResult.error.errors[0].message}`);
      }

      const coreMessages = convertToCoreMessages(messages);
      const vercelOptions = convertToVercelOptions(options);

      const response = await generateText({
        model: this.modelInstance,
        messages: coreMessages,
        ...vercelOptions,
      });

      const toolCalls: ToolCall[] | undefined = response.toolCalls?.map(tc => ({
        id: tc.toolCallId,
        name: tc.toolName,
        arguments: tc.args,
      }));

      return {
        content: response.text,
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          totalTokens: response.usage.promptTokens + response.usage.completionTokens,
        },
        model: this.model,
      };
    }, {
      maxAttempts: this.config.retryAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
      initialDelay: this.config.retryDelay ?? DEFAULT_RETRY_CONFIG.initialDelay,
      maxDelay: DEFAULT_RETRY_CONFIG.maxDelay,
    });
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<StreamChunk> {
    const validationResult = ChatMessageSchema.array().safeParse(messages);
    if (!validationResult.success) {
      throw new Error(`Invalid messages: ${validationResult.error.errors[0].message}`);
    }

    const coreMessages = convertToCoreMessages(messages);
    const vercelOptions = convertToVercelOptions(options);

    const result = await streamText({
      model: this.modelInstance,
      messages: coreMessages,
      ...vercelOptions,
    });

    for await (const chunk of result.textStream) {
      yield {
        content: chunk,
        done: false,
      };
    }

    const response = await result;
    if (response.toolCalls && response.toolCalls.length > 0) {
      yield {
        content: '',
        done: false,
        toolCalls: response.toolCalls.map(tc => ({
          id: tc.toolCallId,
          name: tc.toolName,
          arguments: tc.args,
        })),
      };
    }

    yield {
      content: '',
      done: true,
    };
  }
}

/**
 * Google Provider Implementation using Vercel AI SDK
 */
export class GoogleProvider implements AIProvider {
  readonly type = 'google';
  readonly model: string;
  private modelInstance: LanguageModelV1;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.validateConfig(config);
    this.config = config;

    this.modelInstance = google(config.model, {
      apiKey: config.apiKey,
    });

    this.model = config.model;
  }

  validateConfig(config: AIProviderConfig): void {
    const result = AIProviderConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid Google config: ${result.error.errors[0].message}`);
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    if (!config.model || config.model.trim() === '') {
      throw new Error('Model is required');
    }
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse> {
    return withRetry(async () => {
      const validationResult = ChatMessageSchema.array().safeParse(messages);
      if (!validationResult.success) {
        throw new Error(`Invalid messages: ${validationResult.error.errors[0].message}`);
      }

      const coreMessages = convertToCoreMessages(messages);
      const vercelOptions = convertToVercelOptions(options);

      const response = await generateText({
        model: this.modelInstance,
        messages: coreMessages,
        ...vercelOptions,
      });

      const toolCalls: ToolCall[] | undefined = response.toolCalls?.map(tc => ({
        id: tc.toolCallId,
        name: tc.toolName,
        arguments: tc.args,
      }));

      return {
        content: response.text,
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          totalTokens: response.usage.promptTokens + response.usage.completionTokens,
        },
        model: this.model,
      };
    }, {
      maxAttempts: this.config.retryAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
      initialDelay: this.config.retryDelay ?? DEFAULT_RETRY_CONFIG.initialDelay,
      maxDelay: DEFAULT_RETRY_CONFIG.maxDelay,
    });
  }

  async *stream(messages: ChatMessage[], options?: CompletionOptions): AsyncIterable<StreamChunk> {
    const validationResult = ChatMessageSchema.array().safeParse(messages);
    if (!validationResult.success) {
      throw new Error(`Invalid messages: ${validationResult.error.errors[0].message}`);
    }

    const coreMessages = convertToCoreMessages(messages);
    const vercelOptions = convertToVercelOptions(options);

    const result = await streamText({
      model: this.modelInstance,
      messages: coreMessages,
      ...vercelOptions,
    });

    for await (const chunk of result.textStream) {
      yield {
        content: chunk,
        done: false,
      };
    }

    const response = await result;
    if (response.toolCalls && response.toolCalls.length > 0) {
      yield {
        content: '',
        done: false,
        toolCalls: response.toolCalls.map(tc => ({
          id: tc.toolCallId,
          name: tc.toolName,
          arguments: tc.args,
        })),
      };
    }

    yield {
      content: '',
      done: true,
    };
  }
}

/**
 * Provider factory function
 *
 * Creates the appropriate provider instance based on configuration
 */
export function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'google':
      return new GoogleProvider(config);
    default:
      throw new Error(`Unsupported AI provider type: ${(config as any).type}`);
  }
}

/**
 * Re-export types for convenience
 */
export type {
  AIProviderConfig,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  ToolCall,
  Usage,
};
