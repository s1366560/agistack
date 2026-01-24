import { z } from 'zod';

/**
 * Tool categories for organizing and filtering tools
 */
export const ToolCategoryEnum = ['file', 'code', 'command', 'search', 'ai', 'system'] as const;
export type ToolCategory = (typeof ToolCategoryEnum)[number];

/**
 * Result returned by tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    durationMs: number;
    tokensUsed?: number;
  };
}

/**
 * Permission rule for tool access control
 */
export interface ToolPermission {
  resourceType: 'file' | 'directory' | 'command';
  pattern: string;
  action: 'allow' | 'deny' | 'ask';
}

/**
 * Tool definition with type-safe schemas
 */
export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  handler: (input: unknown) => Promise<ToolResult>;
  permissions?: ToolPermission[];
  rateLimit?: number;
  enabled?: boolean;
  dangerous?: boolean;
  metadata?: {
    version: string;
    author?: string;
    tags?: string[];
  };
}

/**
 * Context information during tool execution
 */
export interface ToolExecutionContext {
  executionId: string;
  sessionId: string;
  userId?: string;
  projectId?: string;
  permissions: ToolPermission[];
}

/**
 * Metadata about a tool
 */
export interface ToolMetadata {
  name: string;
  version: string;
  category: ToolCategory;
  dangerous: boolean;
  deprecated: boolean;
}
