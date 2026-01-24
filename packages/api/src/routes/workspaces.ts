import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { authMiddleware, getAuthUser } from '../middleware/auth';

/**
 * Workspaces router
 * Handles workspace CRUD operations
 */
export const workspacesRouter = new Hono();

// Initialize repository
const workspaceRepository = new WorkspaceRepository();

/**
 * Validation schemas
 */
const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255, 'Workspace name too long'),
  settings: z.object({
    theme: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    }).optional(),
    preferences: z.object({
      language: z.string().optional(),
      timezone: z.string().optional(),
    }).optional(),
  }).optional(),
});

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.object({
    theme: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    }).optional(),
    preferences: z.object({
      language: z.string().optional(),
      timezone: z.string().optional(),
    }).optional(),
  }).optional(),
});

/**
 * GET /api/workspaces
 * List all workspaces for authenticated user
 */
workspacesRouter.get('/', authMiddleware, async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  try {
    const workspaces = await workspaceRepository.findByUserId(user.userId);

    return c.json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch workspaces',
    }, 500);
  }
});

/**
 * GET /api/workspaces/:id
 * Get a single workspace by ID
 */
workspacesRouter.get('/:id', authMiddleware, async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const { id } = c.req.param();

  try {
    const workspace = await workspaceRepository.findById(id);

    if (!workspace) {
      return c.json({
        success: false,
        error: 'Workspace not found',
      }, 404);
    }

    // Check if user owns this workspace
    if (workspace.userId !== user.userId) {
      return c.json({
        success: false,
        error: 'Forbidden: You do not have access to this workspace',
      }, 403);
    }

    return c.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch workspace',
    }, 500);
  }
});

/**
 * GET /api/workspaces/:id/projects
 * Get all projects for a workspace
 */
workspacesRouter.get('/:id/projects', authMiddleware, async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const { id } = c.req.param();

  try {
    // Verify workspace exists and belongs to user
    const workspace = await workspaceRepository.findById(id);

    if (!workspace) {
      return c.json({
        success: false,
        error: 'Workspace not found',
      }, 404);
    }

    if (workspace.userId !== user.userId) {
      return c.json({
        success: false,
        error: 'Forbidden: You do not have access to this workspace',
      }, 403);
    }

    // Get workspace with project count
    const workspaceWithProjects = await workspaceRepository.findWithProjects(id);

    if (!workspaceWithProjects) {
      return c.json({
        success: false,
        error: 'Failed to fetch workspace projects',
      }, 500);
    }

    return c.json({
      success: true,
      data: workspaceWithProjects,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch workspace projects',
    }, 500);
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace
 */
workspacesRouter.post('/', authMiddleware, zValidator('json', CreateWorkspaceSchema), async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const data = c.req.valid('json');

  try {
    const workspace = await workspaceRepository.create({
      userId: user.userId,
      name: data.name,
      settings: data.settings,
    });

    return c.json({
      success: true,
      data: workspace,
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create workspace',
    }, 400);
  }
});

/**
 * PUT /api/workspaces/:id
 * Update a workspace
 */
workspacesRouter.put('/:id', authMiddleware, zValidator('json', UpdateWorkspaceSchema), async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const { id } = c.req.param();
  const data = c.req.valid('json');

  try {
    // Verify ownership
    const workspace = await workspaceRepository.findById(id);

    if (!workspace) {
      return c.json({
        success: false,
        error: 'Workspace not found',
      }, 404);
    }

    if (workspace.userId !== user.userId) {
      return c.json({
        success: false,
        error: 'Forbidden: You do not have access to this workspace',
      }, 403);
    }

    const updatedWorkspace = await workspaceRepository.update(id, data);

    if (!updatedWorkspace) {
      return c.json({
        success: false,
        error: 'Failed to update workspace',
      }, 400);
    }

    return c.json({
      success: true,
      data: updatedWorkspace,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update workspace',
    }, 400);
  }
});

/**
 * PATCH /api/workspaces/:id
 * Partially update a workspace
 */
workspacesRouter.patch('/:id', authMiddleware, zValidator('json', UpdateWorkspaceSchema.partial()), async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const { id } = c.req.param();
  const data = c.req.valid('json');

  try {
    // Verify ownership
    const workspace = await workspaceRepository.findById(id);

    if (!workspace) {
      return c.json({
        success: false,
        error: 'Workspace not found',
      }, 404);
    }

    if (workspace.userId !== user.userId) {
      return c.json({
        success: false,
        error: 'Forbidden: You do not have access to this workspace',
      }, 403);
    }

    const updatedWorkspace = await workspaceRepository.update(id, data);

    if (!updatedWorkspace) {
      return c.json({
        success: false,
        error: 'Failed to update workspace',
      }, 400);
    }

    return c.json({
      success: true,
      data: updatedWorkspace,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update workspace',
    }, 400);
  }
});

/**
 * DELETE /api/workspaces/:id
 * Delete a workspace
 */
workspacesRouter.delete('/:id', authMiddleware, async (c) => {
  const user = getAuthUser(c);

  if (!user) {
    return c.json({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  const { id } = c.req.param();

  try {
    // Verify ownership
    const workspace = await workspaceRepository.findById(id);

    if (!workspace) {
      return c.json({
        success: false,
        error: 'Workspace not found',
      }, 404);
    }

    if (workspace.userId !== user.userId) {
      return c.json({
        success: false,
        error: 'Forbidden: You do not have access to this workspace',
      }, 403);
    }

    const deleted = await workspaceRepository.delete(id);

    if (!deleted) {
      return c.json({
        success: false,
        error: 'Failed to delete workspace',
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        message: 'Workspace deleted successfully',
        id,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to delete workspace',
    }, 500);
  }
});
