import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SessionRepository } from '../repositories/session.repository';
import { MessageRepository } from '../repositories/message.repository';

/**
 * Sessions router
 * Handles CRUD operations for sessions
 */
export const sessionsRouter = new Hono();

// Initialize repositories
export const sessionRepository = new SessionRepository();
export const messageRepository = new MessageRepository();

/**
 * Validation schemas
 */
const agentTypeEnum = z.enum(['build', 'plan', 'general']);

const CreateSessionSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  agentType: agentTypeEnum,
  title: z.string().optional(),
});

const UpdateSessionSchema = z.object({
  title: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

const ListSessionsQuerySchema = z.object({
  projectId: z.string().optional(),
  agentType: agentTypeEnum.optional(),
  limit: z.string().optional().transform((val) => {
    if (val === undefined || val === null || val === '') return 50;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      throw new Error('Limit must be a valid number');
    }
    return parsed;
  }),
  offset: z.string().optional().transform((val) => {
    if (val === undefined || val === null || val === '') return 0;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      throw new Error('Offset must be a valid number');
    }
    return parsed;
  }),
});

/**
 * GET /api/sessions
 * List sessions with optional filters
 */
sessionsRouter.get('/', zValidator('query', ListSessionsQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const { projectId, agentType, limit, offset } = query;

  let sessions;

  if (projectId && agentType) {
    sessions = await sessionRepository.findByAgentType(projectId, agentType);
  } else if (projectId) {
    sessions = await sessionRepository.findByProjectId(projectId);
  } else {
    sessions = await sessionRepository.findAll({ limit, offset });
  }

  return c.json({
    success: true,
    data: sessions,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/sessions/:id
 * Get a single session with messages
 */
sessionsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const session = await sessionRepository.findById(id);

  if (!session) {
    return c.json({
      success: false,
      error: 'Session not found',
      timestamp: new Date().toISOString(),
    }, 404);
  }

  const messages = await messageRepository.findBySessionId(id);

  return c.json({
    success: true,
    data: {
      session,
      messages,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/sessions
 * Create a new session
 */
sessionsRouter.post('/', zValidator('json', CreateSessionSchema), async (c) => {
  const data = c.req.valid('json');

  const session = await sessionRepository.create(data);

  return c.json({
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  }, 201);
});

/**
 * PUT /api/sessions/:id
 * Update a session
 */
sessionsRouter.put('/:id', zValidator('json', UpdateSessionSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const session = await sessionRepository.update(id, data);

  if (!session) {
    return c.json({
      success: false,
      error: 'Session not found',
      timestamp: new Date().toISOString(),
    }, 404);
  }

  return c.json({
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/sessions/:id
 * Partially update a session (only provided fields)
 */
sessionsRouter.patch('/:id', zValidator('json', UpdateSessionSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  // Only update fields that are provided
  const updateData = Object.keys(data).reduce((acc, key) => {
    if (data[key as keyof typeof data] !== undefined) {
      acc[key as keyof typeof data] = data[key as keyof typeof data];
    }
    return acc;
  }, {} as any);

  const session = await sessionRepository.update(id, updateData);

  if (!session) {
    return c.json({
      success: false,
      error: 'Session not found',
      timestamp: new Date().toISOString(),
    }, 404);
  }

  return c.json({
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
sessionsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // First, delete associated messages
  const deletedMessagesCount = await messageRepository.deleteBySession(id);

  // Then delete the session
  const deleted = await sessionRepository.delete(id);

  if (!deleted) {
    return c.json({
      success: false,
      error: 'Session not found',
      timestamp: new Date().toISOString(),
    }, 404);
  }

  return c.json({
    success: true,
    message: 'Session deleted successfully',
    data: {
      deletedMessages: deletedMessagesCount,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error handler for all errors
 */
sessionsRouter.onError((err, c) => {
  console.error('Session router error:', err);

  // Check if it's a validation error (from our custom transforms)
  if (err instanceof Error && (
    err.message.includes('Limit must be') ||
    err.message.includes('Offset must be')
  )) {
    return c.json({
      success: false,
      error: 'Validation failed',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // Check for ZodError (from enum validation)
  if (err.name === 'ZodError' || (err as any).issues) {
    return c.json({
      success: false,
      error: 'Validation failed',
      timestamp: new Date().toISOString(),
    }, 400);
  }

  // Generic error handling
  return c.json({
    success: false,
    error: err instanceof Error ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
  }, 500);
});
