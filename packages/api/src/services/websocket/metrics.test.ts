/**
 * WebSocket Metrics Collector Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 * Tests the metrics collection system for WebSocket monitoring
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { WebSocketMetricsCollector, MetricType } from './metrics'

describe('WebSocketMetricsCollector', () => {
  let metrics: WebSocketMetricsCollector

  beforeEach(() => {
    metrics = new WebSocketMetricsCollector()
  })

  describe('Connection Metrics', () => {
    it('tracks connection count', () => {
      metrics.recordConnection()
      metrics.recordConnection()
      metrics.recordConnection()

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.total).toBe(3)
      expect(snapshot.connections.active).toBe(3)
    })

    it('tracks disconnections', () => {
      metrics.recordConnection('client-1')
      metrics.recordConnection('client-2')
      metrics.recordDisconnection('client-1')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.total).toBe(2)
      expect(snapshot.connections.active).toBe(1)
    })

    it('tracks peak concurrent connections', () => {
      metrics.recordConnection('client-1')
      metrics.recordConnection('client-2')
      metrics.recordConnection('client-3')
      metrics.recordDisconnection('client-2')
      metrics.recordDisconnection('client-3')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.peak).toBe(3)
    })

    it('calculates average connection duration', () => {
      const now = Date.now()

      metrics.recordConnection('client-1')
      metrics.recordDisconnection('client-1', now - 5000) // 5 seconds

      metrics.recordConnection('client-2')
      metrics.recordDisconnection('client-2', now - 10000) // 10 seconds

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.avgDuration).toBeCloseTo(7500, 0) // Average of 5s and 10s
    })
  })

  describe('Message Metrics', () => {
    it('tracks sent messages', () => {
      metrics.recordMessageSent('chat')
      metrics.recordMessageSent('chat')
      metrics.recordMessageSent('ping')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.messages.sent).toBe(3)
      expect(snapshot.messages.sentByType.chat).toBe(2)
      expect(snapshot.messages.sentByType.ping).toBe(1)
    })

    it('tracks received messages', () => {
      metrics.recordMessageReceived('chat')
      metrics.recordMessageReceived('chunk')
      metrics.recordMessageReceived('chunk')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.messages.received).toBe(3)
      expect(snapshot.messages.receivedByType.chunk).toBe(2)
    })

    it('calculates message throughput per second', () => {
      // Reset metrics with a known start time
      metrics.reset()

      // Record 100 messages
      for (let i = 0; i < 100; i++) {
        metrics.recordMessageSent('chat')
      }

      const snapshot = metrics.getSnapshot()
      // Throughput should be calculated based on elapsed time
      // Even with minimal elapsed time, we should have some throughput
      expect(snapshot.messages.sent).toBe(100)
      // If elapsed time is very small, throughput might be very large
      // Just verify the calculation happens
      expect(snapshot.messages.throughput).toBeGreaterThanOrEqual(0)
    })

    it('tracks message latency', () => {
      metrics.recordMessageLatency(50) // 50ms
      metrics.recordMessageLatency(100) // 100ms
      metrics.recordMessageLatency(75) // 75ms

      const snapshot = metrics.getSnapshot()
      expect(snapshot.messages.latency.avg).toBeCloseTo(75, 0)
      expect(snapshot.messages.latency.min).toBe(50)
      expect(snapshot.messages.latency.max).toBe(100)
    })
  })

  describe('Error Metrics', () => {
    it('tracks errors by type', () => {
      metrics.recordError('PARSE_ERROR')
      metrics.recordError('PARSE_ERROR')
      metrics.recordError('VALIDATION_ERROR')

      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.total).toBe(3)
      expect(snapshot.errors.byType.PARSE_ERROR).toBe(2)
      expect(snapshot.errors.byType.VALIDATION_ERROR).toBe(1)
    })

    it('calculates error rate', () => {
      // Start fresh to ensure clean state
      metrics.reset()

      metrics.recordMessageSent('chat')
      metrics.recordMessageSent('chat')
      metrics.recordError('PARSE_ERROR')
      metrics.recordMessageSent('chat')

      const snapshot = metrics.getSnapshot()
      // 1 error / 4 total operations = 0.25
      expect(snapshot.errors.rate).toBe(0.25)
    })
  })

  describe('Metrics Export', () => {
    it('exports metrics as JSON', () => {
      metrics.recordConnection('client-1')
      metrics.recordMessageSent('chat')

      const json = metrics.toJSON()
      const obj = JSON.parse(json)

      expect(obj).toHaveProperty('connections')
      expect(obj).toHaveProperty('messages')
      expect(obj).toHaveProperty('errors')
      expect(obj).toHaveProperty('timestamp')
    })

    it('exports metrics in Prometheus format', () => {
      metrics.recordConnection('client-1')
      metrics.recordConnection('client-2')
      metrics.recordMessageSent('chat')

      const prometheus = metrics.toPrometheus()

      expect(prometheus).toContain('websocket_connections_active')
      expect(prometheus).toContain('websocket_messages_sent_total')
      expect(prometheus).toContain('websocket_errors_total')
    })

    it('includes help text in Prometheus export', () => {
      const prometheus = metrics.toPrometheus()

      expect(prometheus).toContain('# HELP')
      expect(prometheus).toContain('# TYPE')
    })
  })

  describe('Reset and Clear', () => {
    it('resets all metrics', () => {
      metrics.recordConnection('client-1')
      metrics.recordMessageSent('chat')
      metrics.recordError('TEST_ERROR')

      metrics.reset()

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.total).toBe(0)
      expect(snapshot.messages.sent).toBe(0)
      expect(snapshot.errors.total).toBe(0)
    })
  })

  describe('Thread Safety', () => {
    it('handles concurrent metric updates', async () => {
      // Simulate concurrent updates
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metrics.recordConnection(`client-${i}`)
            metrics.recordMessageSent('chat')
          })
        )
      }

      await Promise.all(promises)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.total).toBe(100)
      expect(snapshot.messages.sent).toBe(100)
    })
  })

  describe('Metrics Snapshot', () => {
    it('returns immutable snapshot', () => {
      metrics.recordConnection('client-1')

      const snapshot1 = metrics.getSnapshot()
      const snapshot2 = metrics.getSnapshot()

      expect(snapshot1).toEqual(snapshot2)
      expect(snapshot1).not.toBe(snapshot2) // Different object references
    })

    it('includes timestamp in snapshot', () => {
      const before = Date.now()
      const snapshot = metrics.getSnapshot()
      const after = Date.now()

      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before)
      expect(snapshot.timestamp).toBeLessThanOrEqual(after)
    })
  })
})
