import { z } from 'zod';

/**
 * Message role enumeration
 */
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * Message metadata
 */
export const MessageMetadataSchema = z.object({
  model: z.string().optional(),
  tokensUsed: z.number().optional(),
  duration: z.number().optional(),
  attachments: z.array(z.string()).optional(),
  fileChanges: z.array(z.object({
    path: z.string(),
    type: z.enum(['create', 'update', 'delete']),
  })).optional(),
  codeBlocks: z.array(z.object({
    language: z.string(),
    code: z.string(),
    filename: z.string().optional(),
  })).optional(),
  toolCalls: z.array(z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()),
    result: z.any().optional(),
  })).optional(),
});
export type MessageMetadata = z.infer<typeof MessageMetadataSchema>;

/**
 * Message schema
 */
export const MessageSchema = z.object({
  id: z.string().optional(),
  role: MessageRoleSchema,
  content: z.string(),
  metadata: MessageMetadataSchema.optional(),
  createdAt: z.date().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

/**
 * Message creation input
 */
export const CreateMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1),
  metadata: MessageMetadataSchema.optional(),
});
export type CreateMessage = z.infer<typeof CreateMessageSchema>;

/**
 * Streaming message chunk
 */
export const MessageChunkSchema = z.object({
  delta: z.string(),
  done: z.boolean(),
  metadata: MessageMetadataSchema.partial().optional(),
});
export type MessageChunk = z.infer<typeof MessageChunkSchema>;
