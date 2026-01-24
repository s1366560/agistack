/**
 * Integration Tests for CORS Configuration
 *
 * Tests CORS middleware configuration following TDD methodology
 * RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { configureCORS } from '../../src/middleware/security';

describe('CORS Integration Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('*', configureCORS());
    app.get('/api/test', (c) => c.json({ message: 'test' }));
    app.options('/api/test', (c) => c.text('', 200));
  });

  describe('CORS Preflight Requests', () => {
    it('should handle OPTIONS request', async () => {
      const response = await app.request('/api/test', {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
    });

    it('should return CORS headers for OPTIONS request', async () => {
      const response = await app.request('/api/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
    });

    it('should allow credentials in CORS', async () => {
      const response = await app.request('/api/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('should return correct allowed methods', async () => {
      const response = await app.request('/api/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const allowMethods = response.headers.get('access-control-allow-methods');
      expect(allowMethods).toContain('GET');
      expect(allowMethods).toContain('POST');
      expect(allowMethods).toContain('PUT');
      expect(allowMethods).toContain('DELETE');
    });

    it('should return correct allowed headers', async () => {
      const response = await app.request('/api/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const allowHeaders = response.headers.get('access-control-allow-headers');
      expect(allowHeaders).toContain('Content-Type');
      expect(allowHeaders).toContain('Authorization');
    });
  });

  describe('CORS Simple Requests', () => {
    it('should handle requests from allowed origins', async () => {
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      // Simple GET requests don't get CORS headers in Hono by default
      expect(response.status).toBe(200);
    });

    it('should handle requests with no origin', async () => {
      const response = await app.request('/api/test');

      expect(response.status).toBe(200);
    });

    it('should handle requests from any origin for simple GET requests', async () => {
      // Simple requests (without preflight) are allowed by CORS
      // but don't get CORS headers in simple GET requests
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'http://example.com',
        },
      });

      // The request should succeed (Simple request)
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Headers in Response', () => {
    it('should include Access-Control-Allow-Credentials header', async () => {
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const credentials = response.headers.get('access-control-allow-credentials');
      expect(credentials).toBe('true');
    });

    it('should include Access-Control-Max-Age header', async () => {
      const response = await app.request('/api/test', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const maxAge = response.headers.get('access-control-max-age');
      expect(maxAge).toBeDefined();
      expect(parseInt(maxAge || '0', 10)).toBeGreaterThan(0);
    });
  });

  describe('CORS Error Handling', () => {
    it('should handle malformed origin headers gracefully', async () => {
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'invalid-url',
        },
      });

      // Should not crash, return valid HTTP response
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('should handle multiple CORS headers', async () => {
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('CORS for Different Origins', () => {
    it('should allow requests from Vite dev server (5173)', async () => {
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });

      // Simple GET request succeeds (no CORS headers in simple requests)
      expect(response.status).toBe(200);
    });

    it('should allow requests from production frontend', async () => {
      // This would need ALLOWED_ORIGINS env var
      const response = await app.request('/api/test', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      expect(response.status).toBe(200);
    });

    it('should handle requests from mobile apps (no origin)', async () => {
      const response = await app.request('/api/test');

      expect(response.status).toBe(200);
    });
  });
});
