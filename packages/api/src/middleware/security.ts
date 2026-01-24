import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { MiddlewareHandler } from 'hono';

/**
 * Security configuration based on environment
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Configure CORS for the application
 */
export function configureCORS() {
  const allowedOrigins = isDevelopment
    ? ['http://localhost:3000', 'http://localhost:5173']
    : (process.env.ALLOWED_ORIGINS?.split(',') || []);

  return cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return undefined;

      // In development, allow localhost
      if (isDevelopment) {
        return allowedOrigins.includes(origin) ? origin : null;
      }

      // In production, only allow configured origins
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    maxAge: isDevelopment ? 86400 : 3600,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    // Add CORS headers to simple requests as well
    exposeHeaders: ['Content-Type', 'Authorization'],
  });
}

/**
 * Configure security headers using Hono's secureHeaders
 */
export function configureSecurityHeaders(): MiddlewareHandler {
  // Use Hono's built-in secureHeaders middleware
  return secureHeaders({
    contentSecurityPolicy: isProduction
      ? {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        }
      : undefined, // Disabled in development
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: isProduction,
    crossOriginResourcePolicy: isProduction,
    referrerPolicy: isProduction ? 'no-referrer' : 'unsafe-url',
    originAgentCluster: isProduction,
  });
}

/**
 * Simple rate limiting using in-memory storage
 * Note: For production, use Redis or similar for distributed systems
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function configureRateLimiting(): MiddlewareHandler {
  const WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS = 100;

  return async (c, next) => {
    // Skip rate limiting in test mode
    if (isTest) {
      return next();
    }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
          || c.req.header('x-real-ip')
          || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + WINDOW_MS };
      rateLimitMap.set(ip, entry);
    }

    // Increment counter
    entry.count++;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', MAX_REQUESTS.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count).toString());
    c.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    // Check if over limit
    if (entry.count > MAX_REQUESTS) {
      return c.json({ error: 'Too many requests', retryAfter: Math.ceil((entry.resetTime - now) / 1000) }, 429);
    }

    // Clean up old entries periodically (1% chance)
    if (Math.random() < 0.01) {
      for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }

    return next();
  };
}

/**
 * Configure all security middleware
 */
export function configureSecurityMiddleware(): MiddlewareHandler[] {
  return [
    configureCORS(),
    logger(),
    configureSecurityHeaders(),
    configureRateLimiting(),
  ];
}

/**
 * Get security configuration for reference
 */
export function getSecurityConfig() {
  return {
    cors: {
      allowedOrigins: isDevelopment
        ? ['http://localhost:3000', 'http://localhost:5173']
        : process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true,
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
    },
    headers: {
      hstsEnabled: isProduction,
      cspEnabled: isProduction,
    },
    environment: process.env.NODE_ENV || 'development',
  };
}
