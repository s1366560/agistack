import { describe, it, expect } from 'vitest';
import {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectSummarySchema,
  FileTreeNodeSchema,
  FileContentSchema,
} from './project';

describe('Project Schemas', () => {
  describe('ProjectSchema', () => {
    it('should validate a valid project', () => {
      const validProject = {
        id: 'proj-123',
        workspaceId: 'workspace-456',
        name: 'Test Project',
        path: '/path/to/project',
        description: 'A test project',
        metadata: { key: 'value' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validProject);
      }
    });

    it('should reject invalid project data', () => {
      const invalidProject = {
        id: 'proj-123',
        workspaceId: 'workspace-456',
        name: '', // Invalid: empty name
        path: '/path/to/project',
      };

      const result = ProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should make optional fields truly optional', () => {
      const minimalProject = {
        id: 'proj-123',
        workspaceId: 'workspace-456',
        name: 'Test Project',
        path: '/path/to/project',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ProjectSchema.safeParse(minimalProject);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateProjectSchema', () => {
    it('should validate valid create project input', () => {
      const validInput = {
        workspaceId: 'workspace-456',
        name: 'New Project',
        path: '/path/to/new',
        description: 'A new project',
        metadata: { key: 'value' },
      };

      const result = CreateProjectSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input without required fields', () => {
      const invalidInput = {
        name: 'New Project',
        // Missing workspaceId and path
      };

      const result = CreateProjectSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateProjectSchema', () => {
    it('should accept partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = UpdateProjectSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept empty object for no updates', () => {
      const emptyUpdate = {};

      const result = UpdateProjectSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('FileTreeNodeSchema', () => {
    it('should validate file node', () => {
      const fileNode = {
        path: '/src/index.ts',
        name: 'index.ts',
        type: 'file' as const,
      };

      const result = FileTreeNodeSchema.safeParse(fileNode);
      expect(result.success).toBe(true);
    });

    it('should validate directory node with children', () => {
      const directoryNode = {
        path: '/src',
        name: 'src',
        type: 'directory' as const,
        children: [
          {
            path: '/src/index.ts',
            name: 'index.ts',
            type: 'file' as const,
          },
        ],
      };

      const result = FileTreeNodeSchema.safeParse(directoryNode);
      expect(result.success).toBe(true);
    });
  });

  describe('FileContentSchema', () => {
    it('should validate file content with encoding', () => {
      const fileContent = {
        path: '/src/index.ts',
        content: 'console.log("Hello, World!");',
        encoding: 'utf-8',
      };

      const result = FileContentSchema.safeParse(fileContent);
      expect(result.success).toBe(true);
    });

    it('should default encoding to utf-8', () => {
      const fileContent = {
        path: '/src/index.ts',
        content: 'console.log("Hello, World!");',
      };

      const result = FileContentSchema.safeParse(fileContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.encoding).toBe('utf-8');
      }
    });
  });
});
