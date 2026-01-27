/**
 * WebSocket Server with Metrics Integration Tests
 *
 * TDD Approach: Tests written first for metrics integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WebSocketServer } from './websocket-server'
import { WebSocket } from 'ws'
import { WebSocketMetricsCollector } from './metrics'

describe('WebSocketServer with Metrics Integration', () => {
  let server: WebSocketServer
  let metrics: WebSocketMetricsCollector
  const TEST_PORT = 3011

  beforeEach(async () => {
    metrics = new WebSocketMetricsCollector()
    server = new WebSocketServer({
      jwtSecret: 'test-secret',
      heartbeatInterval: 1000,
      clientTimeout: 5000,
      metricsCollector: metrics,
    })

    await server.start(TEST_PORT)
  })

  afterEach(async () => {
    await server.close()
  })

  describe('Connection Metrics', () => {
    it('records connection when client connects', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}/?token=valid.jwt.token`)

      await new Promise((resolve) => {
        client.on('open', resolve)
      })

      // Wait for metrics to be recorded
      await new Promise((resolve) => setTimeout(resolve, 100))

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.total).toBeGreaterThan(0)
      expect(snapshot.connections.active).toBeGreaterThan(0)

      client.close()
    })

    it('records disconnection when client disconnects', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}/?token=valid.jwt.token`)

      await new Promise((resolve) => {
        client.on('open', resolve)
      })

      // Wait for connection to be recorded
      await new Promise((resolve) => setTimeout(resolve, 100))

      client.close()

      // Wait for disconnection to be processed
      await new Promise((resolve) => setTimeout(resolve, 200))

      const snapshot = metrics.getSnapshot()
      expect(snapshot.connections.active).toBe(0)
    })
  })

  describe('Message Metrics', () => {
    it('records sent messages', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}/?token=valid.jwt.token`)

      await new Promise((resolve) => {
        client.on('open', resolve)
      })

      // Send a ping message
      client.send(JSON.stringify({ type: 'ping' }))

      // Wait for message to be processed
      await new Promise((resolve) => setTimeout(resolve, 50))

      const snapshot = metrics.getSnapshot()
      expect(snapshot.messages.received).toBeGreaterThan(0)

      client.close()
    })

    it('records message types', async () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}/?token=valid.jwt.token`)

      await new Promise((resolve) => {
        client.on('open', resolve)
      })

      // Send different message types
      client.send(JSON.stringify({ type: 'ping' }))
      client.send(JSON.stringify({ type: 'ping' }))
      client.send(JSON.stringify({ type: 'subscribe', sessionId: 'test-session' }))

      await new Promise((resolve) => setTimeout(resolve, 50))

      const snapshot = metrics.getSnapshot()
      expect(snapshot.messages.receivedByType.ping).toBe(2)
      expect(snapshot.messages.receivedByType.subscribe).toBe(1)

      client.close()
    })
  })

  describe('Backward Compatibility', () => {
    it('works without metrics collector', async () => {
      const serverWithoutMetrics = new WebSocketServer({
        jwtSecret: 'test-secret',
        heartbeatInterval: 1000,
      })

      await serverWithoutMetrics.start(TEST_PORT + 1)

      const client = new WebSocket(`ws://localhost:${TEST_PORT + 1}/?token=valid.jwt.token`)

      await new Promise((resolve) => {
        client.on('open', resolve)
      })

      // Should connect successfully (WebSocket.OPEN = 1)
      expect([WebSocket.OPEN, 2]).toContain(client.readyState)

      client.close()
      await serverWithoutMetrics.close()
    })
  })
})
