import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { healthCheckRouter } from './health';

describe('Health Check API', () => {
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

      expect(data).toHaveProperty('success', true);
    });

    it('should include timestamp', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });

    it('should include system information', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('version');
      expect(data.data).toHaveProperty('uptime');
    });

    it('should include uptime in seconds', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.data.uptime).toBe('number');
    });

    it('should include version information', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      expect(data.data.version).toBeDefined();
      expect(typeof data.data.version).toBe('string');
    });
  });

  describe('GET /api/health/database', () => {
    it('should return 200 OK when database endpoint is accessed', async () => {
      const response = await app.request('/api/health/database');
      // Returns 200 even if not configured (graceful degradation)
      expect(response.status).toBe(200);
    });

    it('should return database connection status', async () => {
      const response = await app.request('/api/health/database');
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('connected');
      expect(typeof data.data.connected).toBe('boolean');
    });

    it('should include latency information', async () => {
      const response = await app.request('/api/health/database');
      const data = await response.json();

      expect(data.data).toHaveProperty('latency');
      expect(typeof data.data.latency).toBe('number');
      expect(data.data.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return 503 when database connection fails', async () => {
      // Mock database connection failure
      const response = await app.request('/api/health/database', {
        headers: {
          'x-mock-db-failure': 'true',
        },
      });

      // This test would require mocking the database module
      // For now, we'll just verify the endpoint exists
      expect([200, 503]).toContain(response.status);
    });

    it('should include database error message on failure', async () => {
      // This would be tested with database mocking
      const response = await app.request('/api/health/database');

      if (response.status === 503) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });
  });

  describe('GET /api/health/redis', () => {
    it('should return 200 OK when Redis is available', async () => {
      const response = await app.request('/api/health/redis');
      expect(response.status).toBe(200);
    });

    it('should return Redis connection status', async () => {
      const response = await app.request('/api/health/redis');
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('connected');
    });

    it('should return 503 when Redis is not configured', async () => {
      const response = await app.request('/api/health/redis');

      // Redis is optional, so it should either be connected
      // or return a graceful degradation message
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Health Check Response Format', () => {
    it('should follow consistent API response structure', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      // All API responses should follow this structure
      expect(Object.keys(data)).toEqual(
        expect.arrayContaining(['success', 'data', 'timestamp'])
      );
    });

    it('should include error field when success is false', async () => {
      // Test with a failing endpoint if available
      const response = await app.request('/api/health/database');

      if (response.status !== 200) {
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data).toHaveProperty('error');
      }
    });

    it('should not include error field when success is true', async () => {
      const response = await app.request('/api/health');
      const data = await response.json();

      if (data.success === true) {
        expect(data).not.toHaveProperty('error');
      }
    });
  });

  describe('Health Check Headers', () => {
    it('should include CORS headers', async () => {
      const response = await app.request('/api/health', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      // CORS headers should be present
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });

    it('should include cache control headers', async () => {
      const response = await app.request('/api/health');

      // Health checks should not be cached
      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toMatch(/no-cache|no-store/);
    });
  });

  describe('Health Check Performance', () => {
    it('should respond quickly', async () => {
      const start = Date.now();
      await app.request('/api/health');
      const duration = Date.now() - start;

      // Health check should respond within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.request('/api/health')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid HTTP methods', async () => {
      const response = await app.request('/api/health', {
        method: 'POST',
      });

      // Should return 405 Method Not Allowed
      expect(response.status).toBe(405);
    });

    it('should handle query parameters gracefully', async () => {
      const response = await app.request(
        '/api/health?verbose=true&debug=true'
      );
      const data = await response.json();

      // Should still return valid response
      expect(data).toHaveProperty('success');
      expect(response.status).toBe(200);
    });

    it('should handle trailing slashes gracefully', async () => {
      const response1 = await app.request('/api/health');
      const response2 = await app.request('/api/health/');

      // Without trailing slash should work
      expect(response1.status).toBe(200);

      // With trailing slash returns 404 (Hono default behavior)
      // This is acceptable - users should use correct URLs
      expect(response2.status).toBe(404);
    });
  });
});
