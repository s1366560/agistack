import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

/**
 * Users table
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
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
