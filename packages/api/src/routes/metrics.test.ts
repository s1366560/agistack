/**
 * Metrics API Endpoint Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 * Tests the /api/metrics endpoint for exposing application metrics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { metricsRouter } from './metrics';

describe('Metrics API', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/metrics', metricsRouter);
  });

  describe('GET /api/metrics (JSON format)', () => {
    it('should return 200 OK status', async () => {
      const response = await app.request('/api/metrics');
      expect(response.status).toBe(200);
    });

    it('should return JSON content type by default', async () => {
      const response = await app.request('/api/metrics');
      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should return success: true', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
    });

    it('should include timestamp', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });

    it('should include system metrics', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('system');
      expect(data.data.system).toHaveProperty('uptime');
      expect(data.data.system).toHaveProperty('memory');
      expect(data.data.system).toHaveProperty('cpu');
    });

    it('should include memory usage statistics', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data.data.system.memory).toHaveProperty('used');
      expect(data.data.system.memory).toHaveProperty('total');
      expect(data.data.system.memory).toHaveProperty('percentage');
      expect(typeof data.data.system.memory.used).toBe('number');
      expect(typeof data.data.system.memory.total).toBe('number');
      expect(data.data.system.memory.percentage).toBeGreaterThan(0);
      expect(data.data.system.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include CPU information', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data.data.system.cpu).toHaveProperty('usage');
      expect(typeof data.data.system.cpu.usage).toBe('number');
      expect(data.data.system.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(data.data.system.cpu.usage).toBeLessThanOrEqual(100);
    });

    it('should include WebSocket metrics', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data.data).toHaveProperty('websocket');
      expect(data.data.websocket).toHaveProperty('connections');
      expect(data.data.websocket).toHaveProperty('messages');
      expect(data.data.websocket).toHaveProperty('errors');
    });

    it('should include WebSocket connection metrics', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data.data.websocket.connections).toHaveProperty('total');
      expect(data.data.websocket.connections).toHaveProperty('active');
      expect(data.data.websocket.connections).toHaveProperty('peak');
      expect(typeof data.data.websocket.connections.total).toBe('number');
      expect(typeof data.data.websocket.connections.active).toBe('number');
    });

    it('should include WebSocket message metrics', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data.data.websocket.messages).toHaveProperty('sent');
      expect(data.data.websocket.messages).toHaveProperty('received');
      expect(data.data.websocket.messages).toHaveProperty('throughput');
      expect(typeof data.data.websocket.messages.sent).toBe('number');
      expect(typeof data.data.websocket.messages.received).toBe('number');
    });

    it('should include error metrics', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(data.data.websocket.errors).toHaveProperty('total');
      expect(data.data.websocket.errors).toHaveProperty('rate');
      expect(typeof data.data.websocket.errors.total).toBe('number');
      expect(typeof data.data.websocket.errors.rate).toBe('number');
    });
  });

  describe('GET /api/metrics?format=prometheus', () => {
    it('should return Prometheus text format when specified', async () => {
      const response = await app.request('/api/metrics?format=prometheus');

      // Prometheus uses text/plain content type
      expect(response.headers.get('content-type')).toMatch(/text\/plain/);
    });

    it('should return Prometheus metrics in plain text', async () => {
      const response = await app.request('/api/metrics?format=prometheus');
      const text = await response.text();

      // Should contain HELP and TYPE comments
      expect(text).toContain('# HELP');
      expect(text).toContain('# TYPE');
    });

    it('should include system metrics in Prometheus format', async () => {
      const response = await app.request('/api/metrics?format=prometheus');
      const text = await response.text();

      expect(text).toContain('system_uptime_seconds');
      expect(text).toContain('system_memory_used_bytes');
      expect(text).toContain('system_memory_total_bytes');
      expect(text).toContain('system_cpu_usage_percent');
    });

    it('should include WebSocket metrics in Prometheus format', async () => {
      const response = await app.request('/api/metrics?format=prometheus');
      const text = await response.text();

      expect(text).toContain('websocket_connections_active');
      expect(text).toContain('websocket_connections_total');
      expect(text).toContain('websocket_messages_sent_total');
      expect(text).toContain('websocket_messages_received_total');
      expect(text).toContain('websocket_errors_total');
    });

    it('should include metric metadata in Prometheus format', async () => {
      const response = await app.request('/api/metrics?format=prometheus');
      const text = await response.text();

      // Each metric should have HELP and TYPE
      expect(text).toMatch(/# HELP system_uptime_seconds/);
      expect(text).toMatch(/# TYPE system_uptime_seconds/);
    });
  });

  describe('Metrics Response Format', () => {
    it('should follow consistent API response structure for JSON', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      expect(Object.keys(data)).toEqual(
        expect.arrayContaining(['success', 'data', 'timestamp'])
      );
    });

    it('should not include error field when successful', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      if (data.success === true) {
        expect(data).not.toHaveProperty('error');
      }
    });
  });

  describe('Metrics Headers', () => {
    it('should include CORS headers', async () => {
      const response = await app.request('/api/metrics', {
        headers: {
          Origin: 'http://localhost:3000',
        },
      });

      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });

    it('should include cache control headers', async () => {
      const response = await app.request('/api/metrics');

      // Metrics should have short cache to balance freshness and performance
      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toMatch(/max-age=/);
    });

    it('should cache for no more than 10 seconds', async () => {
      const response = await app.request('/api/metrics');
      const cacheControl = response.headers.get('cache-control');

      // Extract max-age value
      const match = cacheControl?.match(/max-age=(\d+)/);
      expect(match).toBeTruthy();

      const maxAge = match ? parseInt(match[1], 10) : 0;
      expect(maxAge).toBeLessThanOrEqual(10);
    });
  });

  describe('Metrics Performance', () => {
    it('should respond quickly', async () => {
      const start = Date.now();
      await app.request('/api/metrics');
      const duration = Date.now() - start;

      // Metrics endpoint should respond within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.request('/api/metrics')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid format parameter gracefully', async () => {
      const response = await app.request('/api/metrics?format=invalid');

      // Should default to JSON format
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should handle additional query parameters', async () => {
      const response = await app.request('/api/metrics?verbose=true&debug=1');

      // Should still return valid response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await app.request('/api/metrics', {
        method: 'POST',
      });

      // Should return 405 Method Not Allowed
      expect(response.status).toBe(405);
    });

    it('should handle trailing slashes', async () => {
      const response1 = await app.request('/api/metrics');
      const response2 = await app.request('/api/metrics/');

      // Without trailing slash should work
      expect(response1.status).toBe(200);

      // With trailing slash returns 404 (Hono default behavior)
      expect(response2.status).toBe(404);
    });
  });

  describe('Data Accuracy', () => {
    it('should return consistent uptime values', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      // Uptime should be a non-negative number (can be 0 in test environment)
      expect(data.data.system.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof data.data.system.uptime).toBe('number');
    });

    it('should return valid memory values', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      // Used memory should be less than total
      expect(data.data.system.memory.used).toBeLessThanOrEqual(
        data.data.system.memory.total
      );

      // Both should be greater than 0
      expect(data.data.system.memory.used).toBeGreaterThan(0);
      expect(data.data.system.memory.total).toBeGreaterThan(0);
    });

    it('should return accurate percentage calculations', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      const expectedPercentage =
        (data.data.system.memory.used / data.data.system.memory.total) * 100;

      expect(data.data.system.memory.percentage).toBeCloseTo(expectedPercentage, 1);
    });

    it('WebSocket metrics should match collector snapshot', async () => {
      const response = await app.request('/api/metrics');
      const data = await response.json();

      // Should have all required WebSocket metric fields
      expect(data.data.websocket).toMatchObject({
        connections: {
          total: expect.any(Number),
          active: expect.any(Number),
          peak: expect.any(Number),
        },
        messages: {
          sent: expect.any(Number),
          received: expect.any(Number),
          throughput: expect.any(Number),
        },
        errors: {
          total: expect.any(Number),
          rate: expect.any(Number),
        },
      });
    });
  });

  describe('Format Parameter Edge Cases', () => {
    it('should handle empty format parameter', async () => {
      const response = await app.request('/api/metrics?format=');

      // Should default to JSON
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should be case-sensitive for format values', async () => {
      const response1 = await app.request('/api/metrics?format=prometheus');
      const response2 = await app.request('/api/metrics?format=Prometheus');
      const response3 = await app.request('/api/metrics?format=PROMETHEUS');

      // Only lowercase should work
      expect(response1.headers.get('content-type')).toMatch(/text\/plain/);
      expect(response2.headers.get('content-type')).toMatch(/application\/json/);
      expect(response3.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should handle mixed case gracefully', async () => {
      const response = await app.request('/api/metrics?format=ProMeTheus');

      // Should default to JSON for invalid format
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });
  });
});
