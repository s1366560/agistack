import { z } from 'zod';

/**
 * User schema
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * User creation input
 */
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Workspace schema
 */
export const WorkspaceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  settings: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

/**
 * Workspace creation input
 */
export const CreateWorkspaceSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  settings: z.record(z.string(), z.any()).optional(),
});
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;

/**
 * Workspace update input
 */
export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  settings: z.record(z.string(), z.any()).optional(),
});
export type UpdateWorkspace = z.infer<typeof UpdateWorkspaceSchema>;

/**
 * API key (encrypted storage)
 */
export const APIKeySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  provider: z.string(),
  keyHash: z.string(),
  encryptedKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type APIKey = z.infer<typeof APIKeySchema>;

/**
 * Model configuration
 */
export const ModelSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  provider: z.string(),
  modelName: z.string(),
  apiEndpoint: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Model = z.infer<typeof ModelSchema>;

/**
 * Permission rule
 */
export const PermissionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  agentType: z.string().optional(),
  resourceType: z.enum(['file', 'directory', 'command']),
  pattern: z.string(),
  action: z.enum(['allow', 'deny', 'ask']),
  createdAt: z.date(),
});
export type Permission = z.infer<typeof PermissionSchema>;
