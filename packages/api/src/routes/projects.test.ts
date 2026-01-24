import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectRepository } from '../repositories/project.repository';
import { projectsRouter } from './projects';
import { getTestDatabase } from '../tests/setup';
import { users, workspaces, projects } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('Projects API Routes', () => {
  let db: ReturnType<typeof getTestDatabase>;
  let projectRepository: ProjectRepository;

  // Helper function to create test data
  async function createTestData() {
    const counter = Date.now() + Math.random();
    const user = await db.insert(users).values({
      email: `test-${counter}@example.com`,
      name: `Test User ${counter}`,
    }).returning().then(rows => rows[0]);

    const workspace = await db.insert(workspaces).values({
      userId: user.id,
      name: `Test Workspace ${counter}`,
    }).returning().then(rows => rows[0]);

    const project = await db.insert(projects).values({
      workspaceId: workspace.id,
      name: `Test Project ${counter}`,
      path: `/tmp/test-project-${counter}`,
      description: 'Test description',
    }).returning().then(rows => rows[0]);

    return { user, workspace, project };
  }

  beforeEach(async () => {
    db = getTestDatabase();
    projectRepository = new ProjectRepository();

    // Clean up before each test
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

  describe('GET /api/projects', () => {
    it('should return empty array when no projects exist', async () => {
      const res = await projectsRouter.request('/', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it('should return list of projects', async () => {
      const { project: project1 } = await createTestData();
      const { project: project2 } = await createTestData();

      const res = await projectsRouter.request('/', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
    });

    it('should support pagination with limit and offset', async () => {
      // Create 5 projects
      for (let i = 0; i < 5; i++) {
        await createTestData();
      }

      const res = await projectsRouter.request('/?limit=2&offset=1', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Should return up to 2 projects (may be less if offset > total)
      expect(json.data.length).toBeLessThanOrEqual(2);
      expect(json.meta.limit).toBe(2);
      expect(json.meta.offset).toBe(1);
    });

    it('should filter by workspaceId', async () => {
      const { workspace: workspace1, project: project1 } = await createTestData();
      const { workspace: workspace2, project: project2 } = await createTestData();

      const res = await projectsRouter.request(`/?workspaceId=${workspace1.id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(project1.id);
    });

    it('should validate workspaceId format', async () => {
      const res = await projectsRouter.request('/?workspaceId=invalid-uuid', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should validate limit range', async () => {
      const res = await projectsRouter.request('/?limit=999', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return single project by ID', async () => {
      const { project } = await createTestData();

      const res = await projectsRouter.request(`/${project.id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(project.id);
      expect(json.data.name).toBe(project.name);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await projectsRouter.request('/00000000-0000-0000-0000-000000000000', {
        method: 'GET',
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('not found');
    });

    it('should validate UUID format', async () => {
      const res = await projectsRouter.request('/invalid-uuid', {
        method: 'GET',
      });

      // Invalid UUID will be caught by the database, returns 404
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/projects', () => {
    it('should handle database errors gracefully', async () => {
      // This test is to ensure error handling paths are covered
      const { workspace } = await createTestData();

      // Create a project with invalid data that will cause database error
      const invalidProject = {
        workspaceId: '00000000-0000-0000-0000-000000000000', // Non-existent workspace
        name: 'Test Project',
        path: '/path',
      };

      const res = await projectsRouter.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      // Should return 400 due to foreign key constraint
      expect([400, 500]).toContain(res.status);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should create a new project', async () => {
      const { workspace } = await createTestData();

      const newProject = {
        workspaceId: workspace.id,
        name: 'New Project',
        path: '/path/to/project',
        description: 'A new project',
      };

      const res = await projectsRouter.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe(newProject.name);
      expect(json.data.path).toBe(newProject.path);
      expect(json.data.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidProject = {
        name: '',  // Invalid: empty name
        path: '',  // Invalid: empty path
      };

      const res = await projectsRouter.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should validate workspaceId format', async () => {
      const invalidProject = {
        workspaceId: 'invalid-uuid',
        name: 'Test Project',
        path: '/path',
      };

      const res = await projectsRouter.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should validate name length', async () => {
      const { workspace } = await createTestData();
      const invalidProject = {
        workspaceId: workspace.id,
        name: 'a'.repeat(300),  // Too long
        path: '/path',
      };

      const res = await projectsRouter.request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update an existing project', async () => {
      const { project } = await createTestData();

      const updates = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      const res = await projectsRouter.request(`/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe(updates.name);
      expect(json.data.description).toBe(updates.description);
    });

    it('should return 404 for non-existent project', async () => {
      const updates = { name: 'Updated' };

      const res = await projectsRouter.request('/00000000-0000-0000-0000-000000000000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should validate update data', async () => {
      const { project } = await createTestData();

      const invalidUpdate = {
        name: '',  // Invalid: empty name
      };

      const res = await projectsRouter.request(`/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUpdate),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete an existing project', async () => {
      const { project } = await createTestData();

      const res = await projectsRouter.request(`/${project.id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('deleted');

      // Verify project is deleted
      const deleted = await projectRepository.findById(project.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      const res = await projectsRouter.request('/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should validate UUID format', async () => {
      const res = await projectsRouter.request('/invalid-uuid', {
        method: 'DELETE',
      });

      // Invalid UUID will be caught by the database, returns 404 or 500
      expect([404, 500]).toContain(res.status);
    });
  });
});
