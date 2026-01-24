import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { healthCheckRouter } from './routes/health';
import { sessionsRouter } from './routes/sessions';
import { agentsRouter } from './routes/agents';
import { toolsRoutes } from './routes/tools';
import { projectsRouter } from './routes/projects';
import { usersRouter } from './routes/users';
import { workspacesRouter } from './routes/workspaces';
import { authRouter } from './routes/auth';
import { autoBootstrapTools } from './tools/bootstrap';

const app = new Hono();

// Bootstrap tools on startup
autoBootstrapTools();
console.log('Tools bootstrapped successfully');

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

// Auth routes (authentication)
app.route('/api/auth', authRouter);

// Users routes (user management)
app.route('/api/users', usersRouter);

// Workspaces routes (workspace CRUD)
app.route('/api/workspaces', workspacesRouter);

// Projects routes (project CRUD)
app.route('/api/projects', projectsRouter);

// Sessions routes (CRUD with database)
app.route('/api/sessions', sessionsRouter);

// Agents routes (execution, tools, streaming)
app.route('/api/agents', agentsRouter);

// Tools routes (tool management and execution)
app.route('/api/tools', toolsRoutes);

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

// Start server when run directly
const port = parseInt(process.env.API_PORT || '3001');
const server = Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`API server running on http://localhost:${port}`);
