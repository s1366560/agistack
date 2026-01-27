/**
 * Metrics Router
 *
 * Exposes application metrics in JSON and Prometheus formats
 * Integrates with WebSocket metrics collector and system metrics
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketMetricsCollector } from '../services/websocket/metrics';

// Global metrics collector instance
let metricsCollector: WebSocketMetricsCollector | null = null;

/**
 * Get or create the global metrics collector instance
 */
function getMetricsCollector(): WebSocketMetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new WebSocketMetricsCollector();
  }
  return metricsCollector;
}

/**
 * Metrics router
 */
export const metricsRouter = new Hono();

/**
 * CORS middleware
 */
metricsRouter.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Get system metrics
 */
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();

  // Calculate CPU usage as percentage of uptime
  // cpuUsage returns microseconds, convert to seconds then calculate percentage
  const cpuUsageSeconds = (cpuUsage.user + cpuUsage.system) / 1000000;
  const cpuPercent = uptime > 0 ? (cpuUsageSeconds / uptime) * 100 : 0;

  return {
    uptime: Math.floor(uptime),
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    },
    cpu: {
      usage: cpuPercent,
    },
  };
}

/**
 * GET /api/metrics
 * Expose metrics in JSON or Prometheus format
 */
metricsRouter.get('/', async (c) => {
  const format = c.req.query('format') || 'json';
  const metrics = getMetricsCollector();

  if (format === 'prometheus') {
    // Prometheus text format
    const prometheusMetrics = metrics.toPrometheus();
    const systemMetrics = getSystemMetrics();

    // Add system metrics to Prometheus output
    const systemMetricsLines = [
      '',
      '# HELP system_uptime_seconds System uptime in seconds',
      '# TYPE system_uptime_seconds gauge',
      `system_uptime_seconds ${systemMetrics.uptime}`,
      '',
      '# HELP system_memory_used_bytes Memory used in bytes',
      '# TYPE system_memory_used_bytes gauge',
      `system_memory_used_bytes ${systemMetrics.memory.used}`,
      '',
      '# HELP system_memory_total_bytes Total memory in bytes',
      '# TYPE system_memory_total_bytes gauge',
      `system_memory_total_bytes ${systemMetrics.memory.total}`,
      '',
      '# HELP system_memory_usage_percent Memory usage percentage',
      '# TYPE system_memory_usage_percent gauge',
      `system_memory_usage_percent ${systemMetrics.memory.percentage.toFixed(2)}`,
      '',
      '# HELP system_cpu_usage_percent CPU usage percentage',
      '# TYPE system_cpu_usage_percent gauge',
      `system_cpu_usage_percent ${systemMetrics.cpu.usage.toFixed(2)}`,
    ];

    const fullMetrics = prometheusMetrics + systemMetricsLines.join('\n');

    return c.text(fullMetrics, 200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'max-age=10',
    });
  }

  // Default: JSON format
  const systemMetrics = getSystemMetrics();
  const websocketMetrics = metrics.getSnapshot();

  return c.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      system: systemMetrics,
      websocket: websocketMetrics,
    },
  }, 200, {
    'Cache-Control': 'max-age=10',
  });
});

/**
 * Handle unsupported methods
 */
metricsRouter.all('/', (c) => {
  return c.json({
    success: false,
    error: 'Method not allowed',
  }, 405);
});
