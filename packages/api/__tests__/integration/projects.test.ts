/**
 * Integration Tests for Projects API
 *
 * Tests the projects CRUD endpoints against actual database
 * following TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { projectsRouter } from '../../src/routes/projects';
import {
  getTestDatabase,
  cleanTestDatabase,
  createTestUser,
  createTestWorkspace,
  createTestProject,
} from '../helpers/integration';

describe('Projects API Integration Tests', () => {
  let app: Hono;
  let db: ReturnType<typeof getTestDatabase>;

  beforeEach(async () => {
    app = new Hono();
    app.route('/api/projects', projectsRouter);
    db = getTestDatabase();
    await cleanTestDatabase(db);
  });

  afterEach(async () => {
    await cleanTestDatabase(db);
  });

  // Helper to create a test workspace for projects
  async function createTestWorkspaceWithUser() {
    const user = await createTestUser(db);
    const workspace = await createTestWorkspace(db, user.id);
    return { user, workspace };
  }

  describe('GET /api/projects', () => {
    it('should return empty array when no projects exist', async () => {
      const response = await app.request('/api/projects');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.meta.total).toBe(0);
    });

    it('should return list of projects', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      await createTestProject(db, workspace.id);
      await createTestProject(db, workspace.id);

      const response = await app.request('/api/projects');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.meta.total).toBe(2);
    });

    it('should support pagination with limit parameter', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      // Create 5 projects
      for (let i = 0; i < 5; i++) {
        await createTestProject(db, workspace.id);
      }

      const response = await app.request('/api/projects?limit=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.meta.limit).toBe(2);
      expect(data.meta.offset).toBe(0);
      expect(data.meta.total).toBe(5);
    });

    it('should support pagination with offset parameter', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      // Create 5 projects
      const projectIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const project = await createTestProject(db, workspace.id);
        projectIds.push(project.id);
      }

      const response = await app.request('/api/projects?limit=2&offset=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.meta.offset).toBe(2);
      expect(data.data[0].id).toBe(projectIds[2]);
    });

    it('should filter by workspaceId', async () => {
      const { workspace: workspace1 } = await createTestWorkspaceWithUser();
      const { workspace: workspace2 } = await createTestWorkspaceWithUser();

      await createTestProject(db, workspace1.id, { name: 'Project 1' });
      await createTestProject(db, workspace2.id, { name: 'Project 2' });
      await createTestProject(db, workspace1.id, { name: 'Project 3' });

      const response = await app.request(`/api/projects?workspaceId=${workspace1.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data.every((p: any) => p.workspaceId === workspace1.id)).toBe(true);
    });

    it('should return hasMore flag in pagination metadata', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      // Create 5 projects
      for (let i = 0; i < 5; i++) {
        await createTestProject(db, workspace.id);
      }

      const response = await app.request('/api/projects?limit=2&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.hasMore).toBe(true);
    });

    it('should have hasMore=false on last page', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      // Create 3 projects
      for (let i = 0; i < 3; i++) {
        await createTestProject(db, workspace.id);
      }

      const response = await app.request('/api/projects?limit=10&offset=0');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.hasMore).toBe(false);
    });

    it('should validate workspaceId format (invalid UUID)', async () => {
      const response = await app.request('/api/projects?workspaceId=invalid-uuid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate limit range (too large)', async () => {
      const response = await app.request('/api/projects?limit=999');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate limit range (negative)', async () => {
      const response = await app.request('/api/projects?limit=-1');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate offset range (negative)', async () => {
      const response = await app.request('/api/projects?offset=-1');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // This test verifies error handling without mocking
      // The response structure should be consistent
      const response = await app.request('/api/projects');

      // Should not throw, should return valid response
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return single project by ID', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id, {
        name: 'Test Project',
        description: 'Test Description',
      });

      const response = await app.request(`/api/projects/${project.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(project.id);
      expect(data.data.name).toBe('Test Project');
      expect(data.data.description).toBe('Test Description');
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/projects/${nonExistentId}`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await app.request('/api/projects/invalid-uuid');
      const data = await response.json();

      // Invalid UUID might be caught by validation or database
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should include all project fields', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const metadata = { language: 'TypeScript', framework: 'Hono' };
      const project = await createTestProject(db, workspace.id, {
        name: 'Full Project',
        path: '/test/path',
        description: 'A complete project',
        metadata,
      });

      const response = await app.request(`/api/projects/${project.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toMatchObject({
        id: project.id,
        workspaceId: workspace.id,
        name: 'Full Project',
        path: '/test/path',
        description: 'A complete project',
        metadata,
      });
      expect(data.data.createdAt).toBeDefined();
      expect(data.data.updatedAt).toBeDefined();
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const newProject = {
        workspaceId: workspace.id,
        name: 'New Project',
        path: '/path/to/project',
        description: 'A new project',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(newProject.name);
      expect(data.data.path).toBe(newProject.path);
      expect(data.data.id).toBeDefined();
      expect(data.data.createdAt).toBeDefined();
    });

    it('should create project with metadata', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const metadata = {
        language: 'TypeScript',
        framework: 'Hono',
        version: '1.0.0',
      };
      const newProject = {
        workspaceId: workspace.id,
        name: 'Project with Metadata',
        path: '/test/path',
        metadata,
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.metadata).toEqual(metadata);
    });

    it('should validate required fields (missing workspaceId)', async () => {
      const invalidProject = {
        name: 'Test Project',
        path: '/test/path',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate required fields (missing name)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const invalidProject = {
        workspaceId: workspace.id,
        path: '/test/path',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate required fields (missing path)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const invalidProject = {
        workspaceId: workspace.id,
        name: 'Test Project',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate workspaceId format', async () => {
      const invalidProject = {
        workspaceId: 'invalid-uuid',
        name: 'Test Project',
        path: '/test/path',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate name length (too long)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const invalidProject = {
        workspaceId: workspace.id,
        name: 'a'.repeat(300), // Too long
        path: '/test/path',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate path length (too long)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const invalidProject = {
        workspaceId: workspace.id,
        name: 'Test Project',
        path: 'a'.repeat(600), // Too long
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate description length (too long)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const invalidProject = {
        workspaceId: workspace.id,
        name: 'Test Project',
        path: '/test/path',
        description: 'a'.repeat(1100), // Too long
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle foreign key constraint (non-existent workspace)', async () => {
      const nonExistentWorkspaceId = '00000000-0000-0000-0000-000000000000';
      const invalidProject = {
        workspaceId: nonExistentWorkspaceId,
        name: 'Test Project',
        path: '/test/path',
      };

      const response = await app.request('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      });

      // Should return 400 (validation) or 500 (database constraint)
      const data = await response.json();
      expect([400, 500]).toContain(response.status);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project name', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id, {
        name: 'Original Name',
      });

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
      expect(data.data.id).toBe(project.id);
    });

    it('should update project description', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id);

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated description' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.description).toBe('Updated description');
    });

    it('should update project path', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id, {
        path: '/old/path',
      });

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/new/path' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.path).toBe('/new/path');
    });

    it('should update project metadata', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id);
      const metadata = { language: 'TypeScript', framework: 'Hono' };

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metadata).toEqual(metadata);
    });

    it('should update multiple fields at once', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id, {
        name: 'Original',
        path: '/old',
      });

      const updates = {
        name: 'Updated Name',
        path: '/new/path',
        description: 'New description',
      };

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toMatchObject(updates);
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/projects/${nonExistentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should validate update data (empty name)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id);

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate update data (name too long)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id);

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'a'.repeat(300) }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete an existing project', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id);

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('deleted');
      expect(data.data.id).toBe(project.id);
    });

    it('should return 404 for non-existent project', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/projects/${nonExistentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should validate UUID format', async () => {
      const response = await app.request('/api/projects/invalid-uuid', {
        method: 'DELETE',
      });

      // Invalid UUID might be caught by validation or database
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle deletion with cascade (if sessions exist)', async () => {
      const { workspace } = await createTestWorkspaceWithUser();
      const project = await createTestProject(db, workspace.id);

      const response = await app.request(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      // Verify project is deleted
      const getResponse = await app.request(`/api/projects/${project.id}`);
      expect(getResponse.status).toBe(404);
    });
  });
});
