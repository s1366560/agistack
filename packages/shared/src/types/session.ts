import { z } from 'zod';
import { MessageSchema } from './message';
import { AgentTypeSchema } from './agent';

/**
 * Session schema
 */
export const SessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  agentType: AgentTypeSchema,
  title: z.string().optional(),
  messages: z.array(MessageSchema),
  context: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Session = z.infer<typeof SessionSchema>;

/**
 * Session creation input
 */
export const CreateSessionSchema = z.object({
  projectId: z.string(),
  agentType: AgentTypeSchema,
  title: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});
export type CreateSession = z.infer<typeof CreateSessionSchema>;

/**
 * Session update input
 */
export const UpdateSessionSchema = z.object({
  title: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});
export type UpdateSession = z.infer<typeof UpdateSessionSchema>;

/**
 * Session summary (for list views)
 */
export const SessionSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  agentType: AgentTypeSchema,
  title: z.string().optional(),
  messageCount: z.number(),
  lastMessageAt: z.date(),
  createdAt: z.date(),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
