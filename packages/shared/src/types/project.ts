import { z } from 'zod';

/**
 * Project schema
 */
export const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1),
  path: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project creation input
 */
export const CreateProjectSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  path: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type CreateProject = z.infer<typeof CreateProjectSchema>;

/**
 * Project update input
 */
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

/**
 * Project summary (for list views)
 */
export const ProjectSummarySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  path: z.string(),
  sessionCount: z.number(),
  lastSessionAt: z.date().optional(),
  createdAt: z.date(),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * File tree node
 */
export const FileTreeNodeSchema: z.ZodType<{
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: any[];
}> = z.object({
  path: z.string(),
  name: z.string(),
  type: z.enum(['file', 'directory']),
  children: z.array(z.any()).optional(),
});
export type FileTreeNode = z.infer<typeof FileTreeNodeSchema>;

/**
 * File content
 */
export const FileContentSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.string().default('utf-8'),
});
export type FileContent = z.infer<typeof FileContentSchema>;
