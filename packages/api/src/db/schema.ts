import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';

/**
 * Users table
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'), // Password hash for authentication
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Workspaces table
 */
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  settings: jsonb('settings').$type<{
    theme?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
    };
    preferences?: {
      language?: string;
      timezone?: string;
    };
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Projects table
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  path: text('path').notNull(),
  description: text('description'),
  metadata: jsonb('metadata').$type<{
    language?: string;
    framework?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Message role type
 */
export const messageRoleEnum = ['user', 'assistant', 'system'] as const;
export type MessageRole = (typeof messageRoleEnum)[number];

/**
 * Agent type enum
 */
export const agentTypeEnum = ['build', 'plan', 'general'] as const;
export type AgentType = (typeof agentTypeEnum)[number];

/**
 * Permission action enum
 */
export const permissionActionEnum = ['allow', 'deny', 'ask'] as const;
export type PermissionAction = (typeof permissionActionEnum)[number];

/**
 * Agent execution state enum
 */
export const agentStateEnum = ['idle', 'thinking', 'planning', 'executing', 'waiting', 'completed', 'error'] as const;
export type AgentState = (typeof agentStateEnum)[number];

/**
 * Tool category enum
 */
export const toolCategoryEnum = ['file', 'code', 'command', 'search', 'ai', 'system'] as const;
export type ToolCategory = (typeof toolCategoryEnum)[number];

/**
 * Resource type enum
 */
export const resourceTypeEnum = ['file', 'directory', 'command'] as const;
export type ResourceType = (typeof resourceTypeEnum)[number];

/**
 * Sessions table
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  agentType: text('agent_type')
    .notNull()
    .$type<AgentType>(),
  title: text('title'),
  messages: jsonb('messages').$type<
    Array<{
      role: MessageRole;
      content: string;
      metadata?: Record<string, any>;
    }>
  >(),
  context: jsonb('context').$type<{
    model?: string;
    provider?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Messages table
 */
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role')
    .notNull()
    .$type<MessageRole>(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    provider?: string;
    tokensUsed?: number;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Models table
 */
export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  modelName: text('model_name').notNull(),
  apiEndpoint: text('api_endpoint'),
  config: jsonb('config').$type<{
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * API Keys table (encrypted storage)
 */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  keyHash: text('key_hash').notNull(),
  encryptedKey: text('encrypted_key').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Permissions table
 */
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  agentType: text('agent_type').$type<string>(),
  resourceType: text('resource_type')
    .notNull()
    .$type<ResourceType>(),
  pattern: text('pattern').notNull(),
  action: text('action')
    .notNull()
    .$type<PermissionAction>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Agent Executions table
 */
export const agentExecutions = pgTable('agent_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  agentType: text('agent_type')
    .notNull()
    .$type<AgentType>(),
  state: text('state')
    .notNull()
    .$type<AgentState>(),
  inputPrompt: text('input_prompt').notNull(),
  outputSummary: text('output_summary'),
  errorMessage: text('error_message'),
  steps: jsonb('steps').$type<Array<{
    type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>>(),
  tokensUsed: jsonb('tokens_used').$type<{
    input: number;
    output: number;
    total: number;
  }>(),
  durationMs: jsonb('duration_ms').$type<number>(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Agent Tools table
 */
export const agentTools = pgTable('agent_tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  category: text('category')
    .notNull()
    .$type<ToolCategory>(),
  schema: jsonb('schema').notNull().$type<{
    input: Record<string, any>;
    output: Record<string, any>;
  }>(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Agent Tool Usage table
 */
export const agentToolUsage = pgTable('agent_tool_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => agentExecutions.id, { onDelete: 'cascade' }),
  toolName: text('tool_name').notNull(),
  arguments: jsonb('arguments').$type<Record<string, any>>(),
  result: text('result'),
  durationMs: jsonb('duration_ms').$type<number>(),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Type exports
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;

export type APIKey = typeof apiKeys.$inferSelect;
export type NewAPIKey = typeof apiKeys.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type NewAgentExecution = typeof agentExecutions.$inferInsert;

export type AgentTool = typeof agentTools.$inferSelect;
export type NewAgentTool = typeof agentTools.$inferInsert;

export type AgentToolUsage = typeof agentToolUsage.$inferSelect;
export type NewAgentToolUsage = typeof agentToolUsage.$inferInsert;
