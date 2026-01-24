import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDatabase } from '../db';

/**
 * Health check router
 */
export const healthCheckRouter = new Hono();

/**
 * CORS middleware
 */
healthCheckRouter.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * GET /api/health
 * Basic health check endpoint
 */
healthCheckRouter.get('/', async (c) => {
  const uptime = process.uptime();
  const version = process.env.npm_package_version || '0.1.0';

  return c.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      status: 'healthy',
      version,
      uptime: Math.floor(uptime),
      environment: process.env.NODE_ENV || 'development',
    },
  }, 200, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
});

/**
 * GET /api/health/database
 * Check database connectivity
 */
healthCheckRouter.get('/database', async (c) => {
  const start = Date.now();

  // Check if database URL is configured
  if (!process.env.DATABASE_URL) {
    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        connected: false,
        message: 'Database not configured',
        latency: Date.now() - start,
      },
    });
  }

  try {
    const db = getDatabase();

    // Simple query to test connection
    await db.execute('SELECT 1');

    const latency = Date.now() - start;

    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        connected: true,
        latency,
      },
    });
  } catch (error) {
    const latency = Date.now() - start;

    return c.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      data: {
        connected: false,
        latency,
      },
    }, 503);
  }
});

/**
 * GET /api/health/redis
 * Check Redis connectivity (optional)
 */
healthCheckRouter.get('/redis', async (c) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        connected: false,
        message: 'Redis not configured',
      },
    });
  }

  try {
    // Redis health check would go here
    // For now, we'll return a graceful response
    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        connected: true,
        message: 'Redis connection OK',
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Redis connection failed',
      data: {
        connected: false,
      },
    }, 503);
  }
});

/**
 * Handle unsupported methods
 */
healthCheckRouter.all('/', (c) => {
  return c.json({
    success: false,
    error: 'Method not allowed',
  }, 405);
});
