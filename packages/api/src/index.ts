import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { healthCheckRouter } from './routes/health';
import { sessionsRouter } from './routes/sessions';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger());
app.use('*', prettyJSON());

// Health check routes
app.route('/api/health', healthCheckRouter);

// Sessions routes (CRUD with database)
app.route('/api/sessions', sessionsRouter);

// Validation schemas
const CreateProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// In-memory storage (will be replaced with database)
const projects: any[] = [];

// Projects routes
app.get('/api/projects', (c) => {
  return c.json({
    projects,
  });
});

app.post('/api/projects', zValidator('json', CreateProjectSchema), async (c) => {
  const data = c.req.valid('json');

  const project = {
    id: `proj-${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects.push(project);

  return c.json(project, 201);
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'AgiStack API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal server error',
  }, 500);
});

export const api = app;
