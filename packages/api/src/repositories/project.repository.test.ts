import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { ProjectRepository } from './project.repository';
import { projects, users, workspaces } from '../db/schema';
import { getTestDatabase } from '../tests/setup';

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  let db: ReturnType<typeof getTestDatabase>;

  // Helper to create a test user
  async function createTestUser(email: string, name: string) {
    const [user] = await db
      .insert(users)
      .values({ email, name })
      .returning();
    return user;
  }

  // Helper to create a test workspace
  async function createTestWorkspace(userId: string, name: string) {
    const [workspace] = await db
      .insert(workspaces)
      .values({ userId, name })
      .returning();
    return workspace;
  }

  beforeEach(async () => {
    db = getTestDatabase();
    repository = new ProjectRepository();

    // Clean up test data before each test
    await db.delete(projects);
    await db.delete(workspaces);
    await db.delete(users);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(projects);
    await db.delete(workspaces);
    await db.delete(users);
  });

  describe('create', () => {
    it('should create a new project with valid data', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: 'My Project',
        path: '/path/to/project',
        description: 'A test project',
      };

      const project = await repository.create(projectData);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.workspaceId).toBe(projectData.workspaceId);
      expect(project.name).toBe(projectData.name);
      expect(project.path).toBe(projectData.path);
      expect(project.description).toBe(projectData.description);
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a project with only required fields', async () => {
      const user = await createTestUser('minimal@example.com', 'Minimal User');
      const workspace = await createTestWorkspace(user.id, 'Minimal Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: 'Minimal Project',
        path: '/path/to/minimal',
      };

      const project = await repository.create(projectData);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.workspaceId).toBe(projectData.workspaceId);
      expect(project.name).toBe(projectData.name);
      expect(project.path).toBe(projectData.path);
      expect(project.description).toBeNull();
      expect(project.metadata).toBeNull();
    });

    it('should create a project with metadata', async () => {
      const user = await createTestUser('meta@example.com', 'Meta User');
      const workspace = await createTestWorkspace(user.id, 'Meta Workspace');

      const metadata = {
        language: 'TypeScript',
        framework: 'Hono',
        version: '1.0.0',
      };

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Project with Metadata',
        path: '/path/to/project',
        metadata,
      });

      expect(project).toBeDefined();
      expect(project.metadata).toEqual(metadata);
    });

    it('should throw error when creating project with empty name', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: '',
        path: '/path/to/project',
      };

      await expect(repository.create(projectData)).rejects.toThrow('Project name is required');
    });

    it('should throw error when creating project with whitespace-only name', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: '   ',
        path: '/path/to/project',
      };

      await expect(repository.create(projectData)).rejects.toThrow('Project name is required');
    });

    it('should throw error when creating project with null name', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: null as any,
        path: '/path/to/project',
      };

      await expect(repository.create(projectData)).rejects.toThrow();
    });

    it('should throw error when creating project with invalid path (not absolute)', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: 'Invalid Path Project',
        path: 'relative/path',
      };

      await expect(repository.create(projectData)).rejects.toThrow('Project path must be absolute');
    });

    it('should throw error when creating project with empty path', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: 'Empty Path Project',
        path: '',
      };

      await expect(repository.create(projectData)).rejects.toThrow();
    });

    it('should throw error when creating project with path that does not start with /', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const projectData = {
        workspaceId: workspace.id,
        name: 'Bad Path Project',
        path: 'path/without/leading/slash',
      };

      await expect(repository.create(projectData)).rejects.toThrow('Project path must be absolute');
    });

    it('should accept valid absolute paths', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const validPaths = [
        '/usr/local/project',
        '/home/user/project',
        '/tmp/project',
        '/var/www/project',
        'C:\\project', // Windows path
        'D:\\path\\to\\project', // Windows path
      ];

      for (const path of validPaths) {
        const project = await repository.create({
          workspaceId: workspace.id,
          name: `Project ${path}`,
          path,
        });

        expect(project.path).toBe(path);
      }
    });

    it('should throw error when workspace does not exist', async () => {
      const projectData = {
        workspaceId: '00000000-0000-0000-0000-000000000000',
        name: 'Orphan Project',
        path: '/path/to/project',
      };

      // Foreign key constraint should fail
      await expect(repository.create(projectData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find project by valid ID', async () => {
      const user = await createTestUser('find@example.com', 'Find User');
      const workspace = await createTestWorkspace(user.id, 'Find Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Findable Project',
        path: '/path/to/project',
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Findable Project');
      expect(found?.path).toBe('/path/to/project');
    });

    it('should return null when ID does not exist', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });

    it('should return null for invalid UUID format', async () => {
      const found = await repository.findById('invalid-uuid');

      expect(found).toBeNull();
    });

    it('should find project with all fields', async () => {
      const user = await createTestUser('full@example.com', 'Full User');
      const workspace = await createTestWorkspace(user.id, 'Full Workspace');

      const metadata = { language: 'TypeScript', framework: 'Hono' };

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Full Project',
        path: '/path/to/full',
        description: 'A project with all fields',
        metadata,
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.description).toBe('A project with all fields');
      expect(found?.metadata).toEqual(metadata);
    });
  });

  describe('findByWorkspaceId', () => {
    it('should find all projects in a workspace', async () => {
      const user = await createTestUser('workspace@example.com', 'Workspace User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      await repository.create({
        workspaceId: workspace.id,
        name: 'Project 1',
        path: '/path/to/project1',
      });

      await repository.create({
        workspaceId: workspace.id,
        name: 'Project 2',
        path: '/path/to/project2',
      });

      await repository.create({
        workspaceId: workspace.id,
        name: 'Project 3',
        path: '/path/to/project3',
      });

      const foundProjects = await repository.findByWorkspaceId(workspace.id);

      expect(foundProjects).toBeDefined();
      expect(foundProjects).toHaveLength(3);
      expect(foundProjects.map(p => p.name)).toContain('Project 1');
      expect(foundProjects.map(p => p.name)).toContain('Project 2');
      expect(foundProjects.map(p => p.name)).toContain('Project 3');
    });

    it('should return empty array when workspace has no projects', async () => {
      const user = await createTestUser('empty@example.com', 'Empty User');
      const workspace = await createTestWorkspace(user.id, 'Empty Workspace');

      const foundProjects = await repository.findByWorkspaceId(workspace.id);

      expect(foundProjects).toEqual([]);
    });

    it('should return empty array for non-existent workspace', async () => {
      const foundProjects = await repository.findByWorkspaceId('00000000-0000-0000-0000-000000000000');

      expect(foundProjects).toEqual([]);
    });

    it('should not return projects from other workspaces', async () => {
      const user = await createTestUser('multi@example.com', 'Multi User');
      const workspace1 = await createTestWorkspace(user.id, 'Workspace 1');
      const workspace2 = await createTestWorkspace(user.id, 'Workspace 2');

      await repository.create({
        workspaceId: workspace1.id,
        name: 'Project in Workspace 1',
        path: '/path/to/w1/project',
      });

      await repository.create({
        workspaceId: workspace2.id,
        name: 'Project in Workspace 2',
        path: '/path/to/w2/project',
      });

      const workspace1Projects = await repository.findByWorkspaceId(workspace1.id);
      const workspace2Projects = await repository.findByWorkspaceId(workspace2.id);

      expect(workspace1Projects).toHaveLength(1);
      expect(workspace2Projects).toHaveLength(1);
      expect(workspace1Projects[0].name).toBe('Project in Workspace 1');
      expect(workspace2Projects[0].name).toBe('Project in Workspace 2');
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      const user = await createTestUser('update@example.com', 'Update User');
      const workspace = await createTestWorkspace(user.id, 'Update Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Original Name',
        path: '/path/to/project',
      });

      const updated = await repository.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.path).toBe('/path/to/project');
    });

    it('should update project description', async () => {
      const user = await createTestUser('desc@example.com', 'Desc User');
      const workspace = await createTestWorkspace(user.id, 'Desc Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '/path/to/project',
      });

      const updated = await repository.update(created.id, {
        description: 'New description',
      });

      expect(updated).toBeDefined();
      expect(updated?.description).toBe('New description');
    });

    it('should update project path', async () => {
      const user = await createTestUser('path@example.com', 'Path User');
      const workspace = await createTestWorkspace(user.id, 'Path Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '/old/path',
      });

      const updated = await repository.update(created.id, {
        path: '/new/path',
      });

      expect(updated).toBeDefined();
      expect(updated?.path).toBe('/new/path');
    });

    it('should update project metadata', async () => {
      const user = await createTestUser('meta@example.com', 'Meta User');
      const workspace = await createTestWorkspace(user.id, 'Meta Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '/path/to/project',
      });

      const newMetadata = { language: 'TypeScript', framework: 'Hono' };

      const updated = await repository.update(created.id, {
        metadata: newMetadata,
      });

      expect(updated).toBeDefined();
      expect(updated?.metadata).toEqual(newMetadata);
    });

    it('should update multiple fields at once', async () => {
      const user = await createTestUser('multi@example.com', 'Multi User');
      const workspace = await createTestWorkspace(user.id, 'Multi Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Original Name',
        path: '/original/path',
        description: 'Original description',
      });

      const updated = await repository.update(created.id, {
        name: 'New Name',
        path: '/new/path',
        description: 'New description',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Name');
      expect(updated?.path).toBe('/new/path');
      expect(updated?.description).toBe('New description');
    });

    it('should return null when updating non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const updated = await repository.update(nonExistentId, {
        name: 'New Name',
      });

      expect(updated).toBeNull();
    });

    it('should reject updating to empty name', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Original Name',
        path: '/path/to/project',
      });

      await expect(repository.update(created.id, { name: '' })).rejects.toThrow('Project name is required');
    });

    it('should reject updating to invalid path', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Original Name',
        path: '/path/to/project',
      });

      await expect(repository.update(created.id, { path: 'relative/path' })).rejects.toThrow(
        'Project path must be absolute'
      );
    });

    it('should handle empty update object', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Project Name',
        path: '/path/to/project',
      });

      const updated = await repository.update(created.id, {});

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe('Project Name');
    });
  });

  describe('delete', () => {
    it('should delete existing project', async () => {
      const user = await createTestUser('delete@example.com', 'Delete User');
      const workspace = await createTestWorkspace(user.id, 'Delete Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'To Delete',
        path: '/path/to/delete',
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify project no longer exists
      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const deleted = await repository.delete(nonExistentId);

      expect(deleted).toBe(false);
    });

    it('should return false for invalid UUID format', async () => {
      const deleted = await repository.delete('invalid-uuid');

      expect(deleted).toBe(false);
    });

    it('should allow creating new project with same path after deletion', async () => {
      const user = await createTestUser('recreate@example.com', 'Recreate User');
      const workspace = await createTestWorkspace(user.id, 'Recreate Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Original',
        path: '/path/to/project',
      });

      await repository.delete(created.id);

      // Should be able to create new project with same path
      const recreated = await repository.create({
        workspaceId: workspace.id,
        name: 'Recreated',
        path: '/path/to/project',
      });

      expect(recreated).toBeDefined();
      expect(recreated.path).toBe('/path/to/project');
      expect(recreated.id).not.toBe(created.id);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no projects exist', async () => {
      const allProjects = await repository.findAll();

      expect(allProjects).toEqual([]);
    });

    it('should return all projects across all workspaces', async () => {
      const user = await createTestUser('all@example.com', 'All User');
      const workspace1 = await createTestWorkspace(user.id, 'Workspace 1');
      const workspace2 = await createTestWorkspace(user.id, 'Workspace 2');

      const project1 = await repository.create({
        workspaceId: workspace1.id,
        name: 'Project 1',
        path: '/path/to/project1',
      });

      const project2 = await repository.create({
        workspaceId: workspace2.id,
        name: 'Project 2',
        path: '/path/to/project2',
      });

      const project3 = await repository.create({
        workspaceId: workspace1.id,
        name: 'Project 3',
        path: '/path/to/project3',
      });

      const allProjects = await repository.findAll();

      expect(allProjects).toHaveLength(3);
      expect(allProjects.map(p => p.id)).toContain(project1.id);
      expect(allProjects.map(p => p.id)).toContain(project2.id);
      expect(allProjects.map(p => p.id)).toContain(project3.id);
    });

    it('should return projects with correct structure', async () => {
      const user = await createTestUser('struct@example.com', 'Struct User');
      const workspace = await createTestWorkspace(user.id, 'Struct Workspace');

      await repository.create({
        workspaceId: workspace.id,
        name: 'Structured Project',
        path: '/path/to/project',
        description: 'A structured project',
        metadata: { language: 'TypeScript' },
      });

      const allProjects = await repository.findAll();

      expect(allProjects).toHaveLength(1);
      expect(allProjects[0]).toHaveProperty('id');
      expect(allProjects[0]).toHaveProperty('workspaceId');
      expect(allProjects[0]).toHaveProperty('name');
      expect(allProjects[0]).toHaveProperty('path');
      expect(allProjects[0]).toHaveProperty('description');
      expect(allProjects[0]).toHaveProperty('metadata');
      expect(allProjects[0]).toHaveProperty('createdAt');
      expect(allProjects[0]).toHaveProperty('updatedAt');
    });
  });

  describe('Cascade Delete', () => {
    it('should delete all projects when workspace is deleted', async () => {
      const user = await createTestUser('cascade@example.com', 'Cascade User');
      const workspace = await createTestWorkspace(user.id, 'Cascade Workspace');

      // Create multiple projects in the workspace
      const project1 = await repository.create({
        workspaceId: workspace.id,
        name: 'Project 1',
        path: '/path/to/project1',
      });

      const project2 = await repository.create({
        workspaceId: workspace.id,
        name: 'Project 2',
        path: '/path/to/project2',
      });

      const project3 = await repository.create({
        workspaceId: workspace.id,
        name: 'Project 3',
        path: '/path/to/project3',
      });

      // Verify projects exist
      expect(await repository.findById(project1.id)).toBeDefined();
      expect(await repository.findById(project2.id)).toBeDefined();
      expect(await repository.findById(project3.id)).toBeDefined();

      // Delete workspace (cascade should delete projects)
      await db.delete(workspaces).where(eq(workspaces.id, workspace.id));

      // Verify all projects are deleted
      expect(await repository.findById(project1.id)).toBeNull();
      expect(await repository.findById(project2.id)).toBeNull();
      expect(await repository.findById(project3.id)).toBeNull();

      // Verify no projects remain in workspace
      const remainingProjects = await repository.findByWorkspaceId(workspace.id);
      expect(remainingProjects).toEqual([]);
    });

    it('should not affect projects in other workspaces when one workspace is deleted', async () => {
      const user = await createTestUser('multi@example.com', 'Multi User');
      const workspace1 = await createTestWorkspace(user.id, 'Workspace 1');
      const workspace2 = await createTestWorkspace(user.id, 'Workspace 2');

      const project1 = await repository.create({
        workspaceId: workspace1.id,
        name: 'Project in Workspace 1',
        path: '/path/to/w1/project',
      });

      const project2 = await repository.create({
        workspaceId: workspace2.id,
        name: 'Project in Workspace 2',
        path: '/path/to/w2/project',
      });

      // Delete workspace1
      await db.delete(workspaces).where(eq(workspaces.id, workspace1.id));

      // Project1 should be deleted
      expect(await repository.findById(project1.id)).toBeNull();

      // Project2 should still exist
      expect(await repository.findById(project2.id)).toBeDefined();
    });
  });

  describe('Path Validation', () => {
    it('should validate path format on create', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const invalidPaths = [
        'relative/path',
        './relative',
        '../relative',
        'not-absolute',
      ];

      for (const path of invalidPaths) {
        await expect(repository.create({
          workspaceId: workspace.id,
          name: `Invalid Path ${path}`,
          path,
        })).rejects.toThrow('Project path must be absolute');
      }
    });

    it('should validate path format on update', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const created = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '/valid/path',
      });

      const invalidPaths = [
        'relative/path',
        './relative',
        '../relative',
        'not-absolute',
      ];

      for (const path of invalidPaths) {
        await expect(repository.update(created.id, { path })).rejects.toThrow(
          'Project path must be absolute'
        );
      }
    });
  });

  describe('Name Validation', () => {
    it('should trim whitespace from name', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: '  My Project  ',
        path: '/path/to/project',
      });

      // Name should be trimmed
      expect(project.name).toBe('My Project');
    });

    it('should reject name with only whitespace after trimming', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      await expect(repository.create({
        workspaceId: workspace.id,
        name: '     ',
        path: '/path/to/project',
      })).rejects.toThrow('Project name is required');
    });
  });

  describe('findWithWorkspace', () => {
    it('should find project with workspace data', async () => {
      const user = await createTestUser('workspace@example.com', 'Workspace User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Project with Workspace',
        path: '/path/to/project',
        description: 'A test project',
      });

      const result = await repository.findWithWorkspace(project.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(project.id);
      expect(result?.name).toBe('Project with Workspace');
      expect(result?.workspace).toBeDefined();
      expect(result?.workspace.id).toBe(workspace.id);
      expect(result?.workspace.name).toBe('Test Workspace');
      expect(result?.workspace.userId).toBe(user.id);
    });

    it('should return null when project does not exist', async () => {
      const result = await repository.findWithWorkspace('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });

    it('should return project with workspace settings', async () => {
      const user = await createTestUser('settings@example.com', 'Settings User');
      const workspace = await createTestWorkspace(user.id, 'Settings Workspace');

      // Update workspace with settings
      await db.update(workspaces)
        .set({ settings: { theme: 'dark', notifications: { email: true } } })
        .where(eq(workspaces.id, workspace.id));

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Settings Project',
        path: '/path/to/project',
      });

      const result = await repository.findWithWorkspace(project.id);

      expect(result).toBeDefined();
      expect(result?.workspace.settings).toEqual({ theme: 'dark', notifications: { email: true } });
    });
  });

  describe('Path Edge Cases', () => {
    it('should reject path with only whitespace', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      await expect(repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '   ',
      })).rejects.toThrow('Project path is required');
    });

    it('should trim whitespace from valid path', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '  /path/to/project  ',
      });

      expect(project.path).toBe('/path/to/project');
    });

    it('should accept Windows paths with spaces', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Windows Project',
        path: 'C:\\Program Files\\My Project',
      });

      expect(project.path).toBe('C:\\Program Files\\My Project');
    });

    it('should accept Unix paths with spaces', async () => {
      const user = await createTestUser('test@example.com', 'Test User');
      const workspace = await createTestWorkspace(user.id, 'Test Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Unix Project',
        path: '/home/user/my project',
      });

      expect(project.path).toBe('/home/user/my project');
    });
  });

  describe('Metadata Handling', () => {
    it('should store and retrieve complex metadata', async () => {
      const user = await createTestUser('meta@example.com', 'Meta User');
      const workspace = await createTestWorkspace(user.id, 'Meta Workspace');

      const complexMetadata = {
        language: 'TypeScript',
        framework: 'Hono',
        version: '1.0.0',
        dependencies: ['drizzle', 'vitest'],
        config: {
          strict: true,
          target: 'ES2022',
        },
      };

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Complex Project',
        path: '/path/to/project',
        metadata: complexMetadata,
      });

      expect(project.metadata).toEqual(complexMetadata);

      const found = await repository.findById(project.id);
      expect(found?.metadata).toEqual(complexMetadata);
    });

    it('should update metadata', async () => {
      const user = await createTestUser('meta@example.com', 'Meta User');
      const workspace = await createTestWorkspace(user.id, 'Meta Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '/path/to/project',
        metadata: { initial: true },
      });

      const updated = await repository.update(project.id, {
        metadata: { updated: true, version: 2 },
      });

      expect(updated?.metadata).toEqual({ updated: true, version: 2 });
    });

    it('should allow null metadata', async () => {
      const user = await createTestUser('meta@example.com', 'Meta User');
      const workspace = await createTestWorkspace(user.id, 'Meta Workspace');

      const project = await repository.create({
        workspaceId: workspace.id,
        name: 'Project',
        path: '/path/to/project',
        metadata: null,
      });

      expect(project.metadata).toBeNull();
    });
  });
});
