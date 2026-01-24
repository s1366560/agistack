import { z } from 'zod';

/**
 * Agent information schema
 * Based on OpenCode's agent configuration
 */
export const AgentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(['subagent', 'primary', 'all']),
  native: z.boolean().optional(),
  hidden: z.boolean().optional(),
  color: z.string().optional(),
  permission: z.record(z.string(), z.any()),
  model: z.object({
    modelID: z.string(),
    providerID: z.string(),
  }).optional(),
  prompt: z.string().optional(),
  options: z.record(z.string(), z.any()).optional(),
});

export type AgentInfo = z.infer<typeof AgentInfoSchema>;

/**
 * Agent type enumeration
 */
export const AgentTypeSchema = z.enum(['build', 'plan', 'general']);
export type AgentType = z.infer<typeof AgentTypeSchema>;

/**
 * Agent execution state
 */
export const AgentStateSchema = z.enum([
  'idle',
  'thinking',
  'planning',
  'executing',
  'waiting',
  'completed',
  'error'
]);
export type AgentState = z.infer<typeof AgentStateSchema>;

/**
 * Agent capability description
 */
export const AgentCapabilitySchema = z.object({
  canReadFiles: z.boolean(),
  canWriteFiles: z.boolean(),
  canExecuteCommands: z.boolean(),
  canSearchCode: z.boolean(),
  canUseLSP: z.boolean(),
  canUseMCP: z.boolean(),
});
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

/**
 * Agent configuration
 */
export const AgentConfigSchema = z.object({
  type: AgentTypeSchema,
  state: AgentStateSchema,
  capabilities: AgentCapabilitySchema,
  permissions: z.array(z.object({
    resourceType: z.enum(['file', 'directory', 'command']),
    pattern: z.string(),
    action: z.enum(['allow', 'deny', 'ask']),
  })),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
