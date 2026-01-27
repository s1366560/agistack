/**
 * WebSocket Load Testing
 *
 * Tests WebSocket server under high concurrent connection load
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebSocketServer } from 'ws'
import { createWebSocket, closeConnections, getMemoryUsageMB, measureTime } from './helpers'

describe('WebSocket Load Tests', () => {
  let server: WebSocketServer
  let port: number
  const connections: any[] = []

  beforeAll(async () => {
    // Start test WebSocket server
    port = 3001 + Math.floor(Math.random() * 1000)
    server = new WebSocketServer({ port })

    server.on('connection', (ws) => {
      connections.push(ws)

      ws.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString())

          // Echo back
          ws.send(JSON.stringify({
            type: 'echo',
            data: parsed.data,
          }))
        } catch (err) {
          // Ignore parse errors
        }
      })

      ws.on('close', () => {
        const index = connections.indexOf(ws)
        if (index > -1) {
          connections.splice(index, 1)
        }
      })
    })

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        ws.close()
      }
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  })

  it('should handle 100 concurrent connections', async () => {
    const targetConnections = 100
    const url = `ws://localhost:${port}`

    const { result, durationMs } = await measureTime(async () => {
      const wsConnections = await createBatchConnections(url, targetConnections, 20)
      return wsConnections
    })

    const connectionsCreated = result.length
    const avgLatencyPerConnection = durationMs / targetConnections

    expect(connectionsCreated).toBeGreaterThanOrEqual(targetConnections * 0.95) // Allow 5% failure
    expect(avgLatencyPerConnection).toBeLessThan(100) // Less than 100ms per connection

    // Cleanup
    await closeConnections(result)
  })

  it('should maintain stability under load', async () => {
    const targetConnections = 50
    const url = `ws://localhost:${port}`

    // Create connections
    const wsConnections = await createBatchConnections(url, targetConnections, 10)

    // Send messages from all connections
    const messageResults: Array<{ success: boolean; latency: number }> = []

    await Promise.all(
      wsConnections.map(async (ws) => {
        const start = Date.now()

        try {
          ws.send(JSON.stringify({ type: 'test', data: { message: 'load test' } }))

          // Wait for echo
          await new Promise<void>((resolve) => {
            const handler = (data: any) => {
              try {
                const parsed = JSON.parse(data.toString())
                if (parsed.type === 'echo') {
                  ws.removeListener('message', handler)
                  resolve()
                }
              } catch (err) {
                // Ignore
              }
            }

            ws.on('message', handler)

            // Timeout after 1 second
            setTimeout(() => {
              ws.removeListener('message', handler)
              resolve()
            }, 1000)
          })

          const latency = Date.now() - start
          messageResults.push({ success: true, latency })
        } catch (err) {
          messageResults.push({ success: false, latency: 0 })
        }
      })
    )

    const successCount = messageResults.filter((r) => r.success).length
    const successRate = successCount / messageResults.length
    const latencies = messageResults.map((r) => r.latency)

    expect(successRate).toBeGreaterThan(0.95) // 95% success rate

    if (latencies.length > 0) {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      expect(avgLatency).toBeLessThan(100) // Average latency < 100ms
    }

    // Cleanup
    await closeConnections(wsConnections)
  })

  it('should handle rapid connect/disconnect cycles', async () => {
    const cycles = 100
    const url = `ws://localhost:${port}`

    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < cycles; i++) {
      try {
        const ws = await createWebSocket(url, 1000)
        await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay
        ws.close()
        await new Promise((resolve) => setTimeout(resolve, 10)) // Wait for close
        successCount++
      } catch (err) {
        failureCount++
      }
    }

    const successRate = successCount / cycles

    expect(successRate).toBeGreaterThan(0.99) // 99% success rate
    expect(failureCount).toBeLessThan(cycles * 0.01) // Less than 1% failures
  })

  it('should not leak memory under load', async () => {
    const targetConnections = 50
    const url = `ws://localhost:${port}`

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const initialMemory = getMemoryUsageMB()

    // Create and close connections multiple times
    for (let i = 0; i < 5; i++) {
      const wsConnections = await createBatchConnections(url, targetConnections, 10)

      // Send some messages
      await Promise.all(
        wsConnections.map((ws) =>
          new Promise((resolve) => {
            ws.send(JSON.stringify({ type: 'ping' }))
            ws.on('message', () => resolve())
            setTimeout(() => resolve(), 100) // Timeout
          })
        )
      )

      await closeConnections(wsConnections)

      // Small delay between iterations
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Force garbage collection again
    if (global.gc) {
      global.gc()
    }

    const finalMemory = getMemoryUsageMB()
    const memoryGrowth = finalMemory - initialMemory

    // Allow some memory growth but not excessive
    expect(memoryGrowth).toBeLessThan(100) // Less than 100MB growth
  })
})
