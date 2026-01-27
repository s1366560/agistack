// Load environment variables from .env file
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Manually load .env file from project root
try {
  // Get the directory of the current file (packages/api/src/)
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Navigate to project root (packages/api/src -> ../../)
  const envPath = resolve(currentDir, '../../../.env');
  console.log('[API] Loading .env from:', envPath);

  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
  console.log('[API] Environment variables loaded from .env');
  console.log('[API] AI_PROVIDER:', process.env.AI_PROVIDER);
  console.log('[API] AI_MODEL:', process.env.AI_MODEL);
  console.log('[API] AI_BASE_URL:', process.env.AI_BASE_URL);
} catch (error) {
  console.warn('[API] Failed to load .env file:', error);
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { healthCheckRouter } from './routes/health';
import { metricsRouter } from './routes/metrics';
import { sessionsRouter } from './routes/sessions';
import { agentsRouter } from './routes/agents';
import { toolsRoutes } from './routes/tools';
import { projectsRouter } from './routes/projects';
import { usersRouter } from './routes/users';
import { workspacesRouter } from './routes/workspaces';
import { authRouter } from './routes/auth';
import { autoBootstrapTools } from './tools/bootstrap';
import { WebSocketServer } from './services/websocket/websocket-server';
import { WebSocketMetricsCollector } from './services/websocket/metrics';

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

// Metrics routes (monitoring)
app.route('/api/metrics', metricsRouter);

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

// Initialize metrics collector for WebSocket
const wsMetricsCollector = new WebSocketMetricsCollector();

// Create and start WebSocket server
const wsPort = parseInt(process.env.WS_PORT || '3002');
const wsServer = new WebSocketServer({
  jwtSecret: process.env.JWT_SECRET,
  metricsCollector: wsMetricsCollector,
});

// Start WebSocket server
wsServer.start(wsPort)
  .then(() => {
    console.log(`WebSocket server running on ws://localhost:${wsPort}`);
  })
  .catch((error) => {
    console.error('Failed to start WebSocket server:', error);
  });

const server = Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`API server running on http://localhost:${port}`);
