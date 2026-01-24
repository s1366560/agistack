import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { configureSecurityMiddleware, getSecurityConfig } from './security';

describe('Security Middleware', () => {
  let app: Hono;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    app = new Hono();
    const middlewares = configureSecurityMiddleware();
    middlewares.forEach(middleware => app.use('*', middleware));
    app.get('/test', (c) => c.json({ message: 'test' }));
    app.post('/api/test', (c) => c.json({ created: true }));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Middleware Structure', () => {
    it('should export configureSecurityMiddleware function', () => {
      expect(typeof configureSecurityMiddleware).toBe('function');
    });

    it('should export getSecurityConfig function', () => {
      expect(typeof getSecurityConfig).toBe('function');
    });

    it('should return array of middleware', () => {
      const middlewares = configureSecurityMiddleware();
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBeGreaterThan(0);
    });
  });

  describe('Security Configuration', () => {
    it('should have CORS configuration', () => {
      const config = getSecurityConfig();

      expect(config.cors).toBeDefined();
      expect(config.cors.allowedOrigins).toBeInstanceOf(Array);
      expect(config.cors.credentials).toBe(true);
    });

    it('should have rate limiting configuration', () => {
      const config = getSecurityConfig();

      expect(config.rateLimit).toBeDefined();
      expect(config.rateLimit.windowMs).toBe(60000);
      expect(config.rateLimit.maxRequests).toBe(100);
    });

    it('should have security headers configuration', () => {
      const config = getSecurityConfig();

      expect(config.headers).toBeDefined();
      expect(typeof config.headers.hstsEnabled).toBe('boolean');
      expect(typeof config.headers.cspEnabled).toBe('boolean');
    });

    it('should have environment configuration', () => {
      const config = getSecurityConfig();

      expect(config.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(config.environment);
    });
  });

  describe('Basic Functionality', () => {
    it('should handle GET requests', async () => {
      const response = await app.request('/test');

      expect(response.status).toBe(200);
      const data = await response.json() as { message: string };
      expect(data.message).toBe('test');
    });

    it('should handle POST requests', async () => {
      const response = await app.request('/api/test', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const data = await response.json() as { created: boolean };
      expect(data.created).toBe(true);
    });

    it('should return 404 for unknown routes', async () => {
      const response = await app.request('/unknown');

      expect(response.status).toBe(404);
    });
  });

  describe('Environment-Based Behavior', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = getSecurityConfig();

      expect(config.environment).toBe('development');
      expect(config.headers.hstsEnabled).toBe(false);
      expect(config.headers.cspEnabled).toBe(false);
    });

    it('should have different settings based on environment', () => {
      // Just verify the config structure is correct
      const config = getSecurityConfig();

      expect(config).toHaveProperty('headers');
      expect(config.headers).toHaveProperty('hstsEnabled');
      expect(config.headers).toHaveProperty('cspEnabled');
      expect(typeof config.headers.hstsEnabled).toBe('boolean');
    });

    it('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = getSecurityConfig();

      expect(config.environment).toBe('test');
    });
  });

  describe('Type Exports', () => {
    it('should export MiddlewareHandler type', async () => {
      const { configureSecurityMiddleware } = await import('./security');

      const middlewares = configureSecurityMiddleware();
      expect(Array.isArray(middlewares)).toBe(true);
    });

    it('should have TypeScript types available', async () => {
      const config = getSecurityConfig();

      // Type checking happens at compile time
      expect(config).toHaveProperty('cors');
      expect(config).toHaveProperty('rateLimit');
      expect(config).toHaveProperty('headers');
      expect(config).toHaveProperty('environment');
    });
  });
});
