import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ProjectRepository } from '../repositories/project.repository';

/**
 * Projects router
 * Handles CRUD operations for projects
 */
export const projectsRouter = new Hono();

// Initialize repository
const projectRepository = new ProjectRepository();

/**
 * Validation schemas
 */
const CreateProjectSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format'),
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long'),
  path: z.string().min(1, 'Project path is required').max(500, 'Project path too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long').optional(),
  path: z.string().min(1, 'Project path is required').max(500, 'Project path too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const ListProjectsQuerySchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID format').optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)).pipe(
    z.number().int().min(1).max(100)
  ),
  offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)).pipe(
    z.number().int().min(0)
  ),
});

/**
 * GET /api/projects
 * List projects with pagination and workspace filter
 */
projectsRouter.get('/', zValidator('query', ListProjectsQuerySchema), async (c) => {
  const query = c.req.valid('query');

  try {
    // If workspaceId filter is provided, use repository method
    if (query.workspaceId) {
      const projects = await projectRepository.findByWorkspaceId(query.workspaceId);
      const paginated = projects.slice(query.offset, query.offset + query.limit);

      return c.json({
        success: true,
        data: paginated,
        meta: {
          total: projects.length,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < projects.length,
        },
      });
    }

    // Otherwise get all projects with pagination
    const allProjects = await projectRepository.findAll();
    const paginated = allProjects.slice(query.offset, query.offset + query.limit);

    return c.json({
      success: true,
      data: paginated,
      meta: {
        total: allProjects.length,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < allProjects.length,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch projects',
    }, 500);
  }
});

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
projectsRouter.get('/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const project = await projectRepository.findById(id);

    if (!project) {
      return c.json({
        success: false,
        error: 'Project not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: project,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch project',
    }, 500);
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
projectsRouter.post('/', zValidator('json', CreateProjectSchema), async (c) => {
  const data = c.req.valid('json');

  try {
    const project = await projectRepository.create(data);

    return c.json({
      success: true,
      data: project,
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create project',
    }, 400);
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
projectsRouter.put('/:id', zValidator('json', UpdateProjectSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  try {
    const project = await projectRepository.update(id, data);

    if (!project) {
      return c.json({
        success: false,
        error: 'Project not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: project,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update project',
    }, 400);
  }
});

/**
 * PATCH /api/projects/:id
 * Partially update a project (only provided fields)
 */
projectsRouter.patch('/:id', zValidator('json', UpdateProjectSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  try {
    // Only update fields that are provided
    const updateData = Object.keys(data).reduce((acc, key) => {
      if (data[key as keyof typeof data] !== undefined) {
        acc[key as keyof typeof data] = data[key as keyof typeof data];
      }
      return acc;
    }, {} as any);

    const project = await projectRepository.update(id, updateData);

    if (!project) {
      return c.json({
        success: false,
        error: 'Project not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: project,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update project',
    }, 400);
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
projectsRouter.delete('/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const deleted = await projectRepository.delete(id);

    if (!deleted) {
      return c.json({
        success: false,
        error: 'Project not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        message: 'Project deleted successfully',
        id,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to delete project',
    }, 500);
  }
});
