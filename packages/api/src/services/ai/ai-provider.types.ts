/**
 * AI Provider Types
 *
 * Type definitions for the AI provider abstraction layer
 * Supports Anthropic, OpenAI, and Google AI providers
 */

import { z } from 'zod';

/**
 * Supported AI provider types
 */
export const AIProviderTypeSchema = z.enum(['anthropic', 'openai', 'google']);
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>;

/**
 * Chat message roles
 */
export const ChatRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

/**
 * Tool call from AI response
 */
const ToolCallArgumentsSchema = z.object({}).passthrough();
export type ToolCallArguments = z.infer<typeof ToolCallArgumentsSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: ToolCallArgumentsSchema,
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Chat message with optional tool calls
 */
export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  toolCallId: z.string().optional(),
}).refine(
  (data) => {
    // Tool role messages require toolCallId
    if (data.role === 'tool') {
      return !!data.toolCallId;
    }
    return true;
  },
  {
    message: 'toolCallId is required for tool role messages',
    path: ['toolCallId'],
  }
);

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Stream chunk for streaming responses
 */
export const StreamChunkSchema = z.object({
  content: z.string(),
  done: z.boolean(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

/**
 * Token usage information
 */
export const UsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
});

export type Usage = z.infer<typeof UsageSchema>;

/**
 * Completion response
 */
export const CompletionResponseSchema = z.object({
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  usage: UsageSchema,
  model: z.string(),
});

export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;

/**
 * Tool definition for AI providers
 */
export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(), // JSON Schema format
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/**
 * Tool choice options
 */
export const ToolChoiceAutoSchema = z.object({
  type: z.literal('auto'),
});

export const ToolChoiceRequiredSchema = z.object({
  type: z.literal('required'),
});

export const ToolChoiceSpecificSchema = z.object({
  type: z.literal('specific'),
  name: z.string(),
});

export const ToolChoiceSchema = z.discriminatedUnion('type', [
  ToolChoiceAutoSchema,
  ToolChoiceRequiredSchema,
  ToolChoiceSpecificSchema,
]);

export type ToolChoice = z.infer<typeof ToolChoiceSchema>;

/**
 * Completion options
 */
export const CompletionOptionsSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
  tools: z.array(ToolDefinitionSchema).optional(),
  toolChoice: ToolChoiceSchema.optional(),
  stopSequences: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // If toolChoice is specified, tools must be provided
    if (data.toolChoice && (!data.tools || data.tools.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'toolChoice requires tools to be specified',
    path: ['toolChoice'],
  }
).refine(
  (data) => {
    // If toolChoice is 'specific', the tool must exist in tools array
    if (data.toolChoice?.type === 'specific' && data.tools) {
      const toolExists = data.tools.some(tool => tool.name === data.toolChoice.name);
      if (!toolExists) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'toolChoice specifies a tool that is not in the tools array',
    path: ['toolChoice'],
  }
);

export type CompletionOptions = z.infer<typeof CompletionOptionsSchema>;

/**
 * AI provider configuration
 */
export const AIProviderConfigSchema = z.object({
  type: AIProviderTypeSchema,
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseURL: z.string().url().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeout: z.number().int().positive().optional(),
  retryAttempts: z.number().int().min(0).max(10).optional(),
  retryDelay: z.number().int().positive().optional(),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;
