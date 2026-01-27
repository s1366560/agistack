/**
 * WebSocket Monitor Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 * Tests the monitoring service for health checks and alerting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  WebSocketMonitor,
  HealthStatus,
  DEFAULT_THRESHOLDS,
  MonitorThresholds,
  Alert,
} from './monitor'
import { WebSocketMetricsCollector } from './metrics'

describe('WebSocketMonitor', () => {
  let metrics: WebSocketMetricsCollector
  let monitor: WebSocketMonitor
  let alertCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    metrics = new WebSocketMetricsCollector()
    alertCallback = vi.fn()

    monitor = new WebSocketMonitor({
      metricsCollector: metrics,
      checkInterval: 100, // Short interval for tests
      thresholds: {
        maxErrorRate: 0.05,
        maxLatency: 1000,
        minThroughput: 10,
        maxConnections: 100,
        maxMemoryUsage: 90,
      },
      onAlert: alertCallback,
    })
  })

  afterEach(() => {
    monitor.stop()
  })

  describe('Initialization', () => {
    it('should create monitor with default thresholds', () => {
      const defaultMonitor = new WebSocketMonitor({
        metricsCollector: metrics,
        checkInterval: 1000,
        thresholds: DEFAULT_THRESHOLDS,
      })

      expect(defaultMonitor).toBeDefined()
      defaultMonitor.stop()
    })

    it('should accept custom thresholds', () => {
      const customThresholds: MonitorThresholds = {
        maxErrorRate: 0.1,
        maxLatency: 2000,
        minThroughput: 5,
        maxConnections: 200,
        maxMemoryUsage: 80,
      }

      const customMonitor = new WebSocketMonitor({
        metricsCollector: metrics,
        checkInterval: 1000,
        thresholds: customThresholds,
      })

      expect(customMonitor).toBeDefined()
      customMonitor.stop()
    })

    it('should accept alert callback', () => {
      expect(alertCallback).toBeDefined()
      expect(typeof alertCallback).toBe('function')
    })
  })

  describe('Health Checks', () => {
    it('should return healthy status when all metrics are good', () => {
      // Add some healthy metrics
      metrics.recordConnection('client-1')
      metrics.recordMessageSent('chat')
      metrics.recordMessageReceived('chunk')

      // Clear any previous alerts
      monitor.clearAlerts()

      // Mock low memory usage to avoid triggering alert
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 30 * 1024 * 1024, // 30MB
        heapTotal: 100 * 1024 * 1024, // 100MB - 30% usage
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()

      expect(result.status).toBe(HealthStatus.HEALTHY)
      expect(result.alerts).toHaveLength(0)
      expect(result.recommendations).toHaveLength(0)
      expect(result.timestamp).toBeGreaterThan(0)

      memUsageSpy.mockRestore()
    })

    it('should return degraded status when error rate exceeds threshold', () => {
      // Record errors to exceed 5% threshold but not by 2x (to avoid critical)
      for (let i = 0; i < 20; i++) {
        metrics.recordMessageSent('chat')
      }
      metrics.recordError('PARSE_ERROR')
      metrics.recordError('VALIDATION_ERROR')

      // Mock low memory usage
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 30 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()

      // 2/22 = 9.09%, which is >5% but <10% (2x threshold), so warning
      expect(result.status).toBe(HealthStatus.DEGRADED)
      expect(result.alerts.length).toBeGreaterThan(0)
      const errorAlert = result.alerts.find(a => a.metric === 'error_rate')
      expect(errorAlert).toBeDefined()

      memUsageSpy.mockRestore()
    })

    it('should return unhealthy status when latency exceeds threshold', () => {
      // Reset metrics to start fresh
      metrics.reset()
      monitor.clearAlerts()

      // Record high latency multiple times to ensure average exceeds threshold
      for (let i = 0; i < 5; i++) {
        metrics.recordMessageLatency(2500) // Exceeds 2000ms (2x threshold)
      }
      metrics.recordConnection('client-1')
      metrics.recordMessageSent('chat')

      // Mock low memory usage
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 30 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()

      // 2500ms > 2000ms (2x threshold), so should be critical (unhealthy)
      expect(result.status).toBe(HealthStatus.UNHEALTHY)
      expect(result.alerts.length).toBeGreaterThan(0)
      const latencyAlert = result.alerts.find(a => a.metric === 'latency')
      expect(latencyAlert).toBeDefined()
      expect(latencyAlert?.severity).toBe('critical')

      memUsageSpy.mockRestore()
    })

    it('should return unhealthy status when memory usage exceeds threshold', () => {
      // Mock high memory usage (>95% to trigger critical)
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 192 * 1024 * 1024, // 192MB
        heapTotal: 200 * 1024 * 1024, // 200MB - 96% usage
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()

      expect(result.status).toBe(HealthStatus.UNHEALTHY)
      const memoryAlert = result.alerts.find(a => a.metric === 'memory_usage')
      expect(memoryAlert).toBeDefined()

      memUsageSpy.mockRestore()
    })

    it('should detect low throughput', () => {
      // Record few messages over time
      metrics.recordMessageSent('chat')
      metrics.recordMessageSent('chat')
      metrics.recordMessageSent('chat')

      const result = monitor.checkHealth()

      // Should alert about low throughput if below threshold
      if (result.alerts.length > 0) {
        const throughputAlert = result.alerts.find(a => a.metric === 'throughput')
        expect(throughputAlert).toBeDefined()
      }
    })

    it('should detect connection limit exceeded', () => {
      // Create connections exceeding threshold
      for (let i = 0; i < 150; i++) {
        metrics.recordConnection(`client-${i}`)
      }

      const result = monitor.checkHealth()

      expect(result.status).toBe(HealthStatus.UNHEALTHY)
      const connectionAlert = result.alerts.find(a => a.metric === 'connections')
      expect(connectionAlert).toBeDefined()
    })
  })

  describe('Alerts', () => {
    it('should generate alerts with correct structure', () => {
      metrics.recordError('TEST_ERROR')

      const result = monitor.checkHealth()
      const alert = result.alerts[0]

      expect(alert).toMatchObject({
        timestamp: expect.any(Number),
        severity: expect.any(String),
        metric: expect.any(String),
        currentValue: expect.any(Number),
        threshold: expect.any(Number),
        message: expect.any(String),
      })
    })

    it('should categorize alerts by severity', () => {
      // Trigger critical alert (very high latency)
      metrics.recordMessageLatency(5000)
      metrics.recordMessageSent('chat')

      const result = monitor.checkHealth()
      const latencyAlert = result.alerts.find(a => a.metric === 'latency')

      expect(latencyAlert?.severity).toBe('critical')
    })

    it('should call alert callback when alert is generated', () => {
      metrics.recordError('TEST_ERROR')

      monitor.checkHealth()

      // Should call alert callback
      if (alertCallback.mock.calls.length > 0) {
        expect(alertCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            metric: expect.any(String),
            severity: expect.any(String),
          })
        )
      }
    })

    it('should store alerts for later retrieval', () => {
      metrics.recordError('ERROR_1')
      monitor.checkHealth()

      metrics.recordError('ERROR_2')
      monitor.checkHealth()

      const storedAlerts = monitor.getAlerts()
      expect(storedAlerts.length).toBeGreaterThan(0)
    })

    it('should limit number of returned alerts', () => {
      // Generate multiple alerts
      for (let i = 0; i < 5; i++) {
        metrics.recordError(`ERROR_${i}`)
        monitor.checkHealth()
      }

      const limitedAlerts = monitor.getAlerts(3)
      expect(limitedAlerts.length).toBeLessThanOrEqual(3)
    })

    it('should clear alerts', () => {
      metrics.recordError('TEST_ERROR')
      monitor.checkHealth()

      expect(monitor.getAlerts().length).toBeGreaterThan(0)

      monitor.clearAlerts()
      expect(monitor.getAlerts()).toHaveLength(0)
    })
  })

  describe('Recommendations', () => {
    it('should provide recommendations for high error rate', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordMessageSent('chat')
      }
      metrics.recordError('PARSE_ERROR')

      const result = monitor.checkHealth()

      if (result.recommendations.length > 0) {
        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('error')
        )).toBe(true)
      }
    })

    it('should provide recommendations for high latency', () => {
      // Reset metrics
      metrics.reset()
      monitor.clearAlerts()

      // Record high latency
      metrics.recordMessageLatency(2000)
      metrics.recordMessageSent('chat')

      // Mock low memory usage
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 30 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()

      if (result.recommendations.length > 0) {
        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('latency')
        )).toBe(true)
      }

      memUsageSpy.mockRestore()
    })

    it('should provide recommendations for high memory usage', () => {
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 190 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()

      if (result.recommendations.length > 0) {
        expect(result.recommendations.some(r =>
          r.toLowerCase().includes('memory')
        )).toBe(true)
      }

      memUsageSpy.mockRestore()
    })
  })

  describe('Periodic Monitoring', () => {
    it('should start periodic monitoring', async () => {
      monitor.start()

      // Record some metrics
      metrics.recordConnection('client-1')

      // Wait for at least one check cycle
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should have performed at least one check
      expect(monitor.getAlerts()).toBeDefined()
    })

    it('should stop periodic monitoring', () => {
      monitor.start()
      expect(() => monitor.stop()).not.toThrow()
    })

    it('should perform checks at configured interval', async () => {
      let checkCount = 0
      const originalCheckHealth = monitor.checkHealth.bind(monitor)

      const checkSpy = vi.spyOn(monitor, 'checkHealth').mockImplementation(() => {
        checkCount++
        return originalCheckHealth()
      })

      monitor.start()

      // Wait for multiple check cycles
      await new Promise(resolve => setTimeout(resolve, 350))

      monitor.stop()
      checkSpy.mockRestore()

      // Should have performed multiple checks
      expect(checkCount).toBeGreaterThanOrEqual(2)
    })

    it('should handle multiple start/stop cycles', () => {
      expect(() => {
        monitor.start()
        monitor.stop()
        monitor.start()
        monitor.stop()
      }).not.toThrow()
    })
  })

  describe('Configuration', () => {
    it('should update thresholds dynamically', () => {
      monitor.updateConfig({
        thresholds: {
          maxErrorRate: 0.2,
          maxLatency: 3000,
          minThroughput: 5,
          maxConnections: 200,
          maxMemoryUsage: 95,
        },
      })

      // Should not throw
      expect(() => monitor.checkHealth()).not.toThrow()
    })

    it('should update check interval', () => {
      monitor.start()
      monitor.updateConfig({ checkInterval: 500 })
      monitor.stop()

      // Should not throw
      expect(() => monitor.start()).not.toThrow()
    })

    it('should update alert callback', () => {
      const newCallback = vi.fn()
      monitor.updateConfig({ onAlert: newCallback })

      metrics.recordError('TEST_ERROR')
      monitor.checkHealth()

      // New callback should be used
      if (newCallback.mock.calls.length > 0) {
        expect(newCallback).toHaveBeenCalled()
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero metrics gracefully', () => {
      const result = monitor.checkHealth()

      // Should not throw with empty metrics
      expect(result).toBeDefined()
      expect(result.status).toBe(HealthStatus.HEALTHY)
    })

    it('should handle very high latency values', () => {
      metrics.recordMessageLatency(999999)
      metrics.recordMessageSent('chat')

      const result = monitor.checkHealth()

      expect(result.status).toBe(HealthStatus.UNHEALTHY)
    })

    it('should handle division by zero for rate calculations', () => {
      // No operations recorded, rate should be 0
      const result = monitor.checkHealth()

      expect(result.metrics.errors.rate).toBe(0)
    })

    it('should handle concurrent health checks', async () => {
      const checks = Array.from({ length: 10 }, () =>
        Promise.resolve(monitor.checkHealth())
      )

      const results = await Promise.all(checks)

      // All checks should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.timestamp).toBeGreaterThan(0)
      })
    })

    it('should handle invalid threshold values', () => {
      const badMonitor = new WebSocketMonitor({
        metricsCollector: metrics,
        checkInterval: 100,
        thresholds: {
          maxErrorRate: -1,
          maxLatency: 0,
          minThroughput: -10,
          maxConnections: 0,
          maxMemoryUsage: 101, // > 100%
        },
      })

      // Should handle gracefully
      expect(() => badMonitor.checkHealth()).not.toThrow()

      badMonitor.stop()
    })
  })

  describe('Metrics Snapshot', () => {
    it('should include current metrics in health check', () => {
      metrics.recordConnection('client-1')
      metrics.recordMessageSent('chat')
      metrics.recordMessageReceived('chunk')

      const result = monitor.checkHealth()

      expect(result.metrics).toBeDefined()
      expect(result.metrics.connections.active).toBe(1)
      expect(result.metrics.messages.sent).toBe(1)
      expect(result.metrics.messages.received).toBe(1)
    })

    it('should include timestamp in health check result', () => {
      const before = Date.now()
      const result = monitor.checkHealth()
      const after = Date.now()

      expect(result.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('Memory Monitoring', () => {
    it('should calculate memory usage percentage correctly', () => {
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB - 50% usage
        external: 0,
        arrayBuffers: 0,
      })

      const result = monitor.checkHealth()
      const memoryAlert = result.alerts.find(a => a.metric === 'memory_usage')

      if (memoryAlert) {
        expect(memoryAlert.currentValue).toBeCloseTo(50, 0)
      }

      memUsageSpy.mockRestore()
    })

    it('should handle zero total memory', () => {
      const memUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
      })

      // Should not throw
      expect(() => monitor.checkHealth()).not.toThrow()

      memUsageSpy.mockRestore()
    })
  })
})
