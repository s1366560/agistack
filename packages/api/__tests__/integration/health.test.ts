/**
 * Integration Tests for Health Check API
 *
 * Tests the health check endpoints against actual API responses
 * following TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { healthCheckRouter } from '../../src/routes/health';

describe('Health Check API Integration Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/health', healthCheckRouter);
  });

  describe('GET /api/health', () => {
    it('should return 200 OK status', async () => {
      const response = await app.request('/api/health');

      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response = await app.request('/api/health');

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should return success: true', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should include timestamp in ISO format', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should include system information in data field', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.data.status).toBe('healthy');
      expect(data.data.version).toBeDefined();
      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.data.environment).toBeDefined();
    });

    it('should include cache-control headers to prevent caching', async () => {
      const response = await app.request('/api/health');

      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-store');
    });

    it('should include pragma: no-cache header', async () => {
      const response = await app.request('/api/health');

      const pragma = response.headers.get('pragma');
      expect(pragma).toBe('no-cache');
    });

    it('should include expires: 0 header', async () => {
      const response = await app.request('/api/health');

      const expires = response.headers.get('expires');
      expect(expires).toBe('0');
    });

    it('should respond within 100ms', async () => {
      const start = Date.now();
      await app.request('/api/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /api/health/database', () => {
    it('should return 200 or 503 when database is not configured', async () => {
      // In test environment, DATABASE_URL might not be set
      const response = await app.request('/api/health/database');

      // Should return 200 (graceful) or 503 (error) depending on configuration
      expect([200, 503]).toContain(response.status);
    });

    it('should return connection status in response', async () => {
      const response = await app.request('/api/health/database');
      const data = await response.json();

      expect(data.success).toBeDefined();
      expect(data.data).toBeDefined();
      expect(data.data.connected).toBeDefined();
      expect(typeof data.data.connected).toBe('boolean');
    });

    it('should include latency information', async () => {
      const response = await app.request('/api/health/database');
      const data = await response.json();

      expect(data.data.latency).toBeDefined();
      expect(typeof data.data.latency).toBe('number');
      expect(data.data.latency).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp', async () => {
      const response = await app.request('/api/health/database');
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/health/redis', () => {
    it('should return 200 OK when Redis is not configured', async () => {
      // Redis is optional, should return graceful response
      const response = await app.request('/api/health/redis');

      expect([200, 503]).toContain(response.status);
    });

    it('should return connection status in response', async () => {
      const response = await app.request('/api/health/redis');
      const data = await response.json();

      expect(data.success).toBeDefined();
      expect(data.data).toBeDefined();
      expect(data.data.connected).toBeDefined();
      expect(typeof data.data.connected).toBe('boolean');
    });

    it('should include message when Redis not configured', async () => {
      const response = await app.request('/api/health/redis');
      const data = await response.json();

      if (!data.data.connected) {
        expect(data.data.message).toBeDefined();
      }
    });
  });

  describe('Response Format', () => {
    it('should follow consistent API response structure', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      // All successful responses should have these fields
      expect(Object.keys(data)).toContain('success');
      expect(Object.keys(data)).toContain('data');
      expect(Object.keys(data)).toContain('timestamp');
    });

    it('should not include error field when success is true', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      if (data.success === true) {
        expect(data).not.toHaveProperty('error');
      }
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await app.request('/api/health', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      const corsHeader = response.headers.get('access-control-allow-origin');
      expect(corsHeader).toBeTruthy();
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for POST requests', async () => {
      const response = await app.request('/api/health', {
        method: 'POST',
      });

      expect(response.status).toBe(405);
    });

    it('should return 405 for PUT requests', async () => {
      const response = await app.request('/api/health', {
        method: 'PUT',
      });

      expect(response.status).toBe(405);
    });

    it('should return 405 for DELETE requests', async () => {
      const response = await app.request('/api/health', {
        method: 'DELETE',
      });

      expect(response.status).toBe(405);
    });

    it('should include error message for invalid methods', async () => {
      const response = await app.request('/api/health', {
        method: 'POST',
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle query parameters gracefully', async () => {
      const response = await app.request('/api/health?verbose=true&debug=true');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.request('/api/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle OPTIONS request', async () => {
      const response = await app.request('/api/health', {
        method: 'OPTIONS',
      });

      // CORS preflight returns 204 No Content or 405 Method Not Allowed
      expect([200, 204, 405]).toContain(response.status);
    });
  });
});
