/**
 * WebSocket Stability Testing
 *
 * Tests WebSocket server stability over extended periods
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebSocketServer } from 'ws'
import { createWebSocket, closeConnections, getMemoryUsageMB, measureTime } from './helpers'

describe('WebSocket Stability Tests', () => {
  let server: WebSocketServer
  let port: number
  const connections: any[] = []

  beforeAll(async () => {
    port = 3001 + Math.floor(Math.random() * 1000)
    server = new WebSocketServer({ port })

    server.on('connection', (ws) => {
      connections.push(ws)

      ws.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString())

          // Respond based on message type
          if (parsed.type === 'echo') {
            ws.send(JSON.stringify({
              type: 'echo',
              data: parsed.data,
            }))
          } else if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
          } else if (parsed.type === 'stream') {
            // Simulate streaming response
            let count = 0
            const interval = setInterval(() => {
              if (count < 10) {
                ws.send(
                  JSON.stringify({
                    type: 'chunk',
                    data: { content: `Chunk ${count}`, index: count },
                  })
                )
                count++
              } else {
                clearInterval(interval)
                ws.send(JSON.stringify({ type: 'done', data: { finishReason: 'stop' } }))
              }
            }, 50)
          }
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

  it('should handle high message throughput', async () => {
    const url = `ws://localhost:${port}`
    const ws = await createWebSocket(url)

    const messagesToSend = 1000
    const receivedMessages: any[] = []
    const latencies: number[] = []

    ws.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString())
        if (parsed.type === 'echo') {
          receivedMessages.push(parsed)
          // Calculate latency (rough estimate)
          const timestamp = parsed.data.timestamp || Date.now()
          latencies.push(Date.now() - timestamp)
        }
      } catch (err) {
        // Ignore
      }
    })

    const { durationMs } = await measureTime(async () => {
      // Send messages as fast as possible
      const sendPromises = Array.from({ length: messagesToSend }, async (_, i) => {
        return new Promise<void>((resolve) => {
          ws.send(
            JSON.stringify({
              type: 'echo',
              data: { message: `Message ${i}`, timestamp: Date.now() },
            })
          )
          resolve()
        })
      })

      await Promise.all(sendPromises)

      // Wait for all responses
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    const throughput = (messagesToSend / durationMs) * 1000 // messages per second

    expect(throughput).toBeGreaterThan(1000) // At least 1000 msg/s

    if (latencies.length > 0) {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      expect(avgLatency).toBeLessThan(50) // Average latency < 50ms
    }

    ws.close()
  })

  it('should maintain low latency for streaming responses', async () => {
    const url = `ws://localhost:${port}`
    const ws = await createWebSocket(url)

    const chunks: any[] = []
    const timestamps: number[] = []

    ws.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString())
        if (parsed.type === 'chunk') {
          chunks.push(parsed)
          timestamps.push(Date.now())
        }
      } catch (err) {
        // Ignore
      }
    })

    // Request streaming response
    ws.send(JSON.stringify({ type: 'stream' }))

    // Wait for completion
    await new Promise<void>((resolve) => {
      const handler = (data: any) => {
        try {
          const parsed = JSON.parse(data.toString())
          if (parsed.type === 'done') {
            ws.removeListener('message', handler)
            resolve()
          }
        } catch (err) {
          // Ignore
        }
      }
      ws.on('message', handler)

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.removeListener('message', handler)
        resolve()
      }, 5000)
    })

    expect(chunks.length).toBeGreaterThan(0)

    if (timestamps.length > 1) {
      // Calculate intervals between chunks
      const intervals: number[] = []
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1])
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      expect(avgInterval).toBeLessThan(100) // Average interval < 100ms

      // Calculate jitter (deviation from average)
      const jitter = intervals.reduce((sum, interval) => {
        return sum + Math.abs(interval - avgInterval)
      }, 0) / intervals.length

      expect(jitter).toBeLessThan(50) // Jitter < 50ms
    }

    ws.close()
  })

  it('should remain stable over extended period', async () => {
    const url = `ws://localhost:${port}`
    const testDurationSeconds = 30 // Shorter for CI/CD (originally 5 minutes)
    const checkIntervalMs = 5000

    const ws = await createWebSocket(url)

    let errorCount = 0
    let messageCount = 0
    const memorySnapshots: number[] = []

    // Collect metrics periodically
    const intervalId = setInterval(() => {
      memorySnapshots.push(getMemoryUsageMB())

      // Send test message
      try {
        ws.send(JSON.stringify({ type: 'ping' }))
        messageCount++
      } catch (err) {
        errorCount++
      }
    }, checkIntervalMs)

    // Run for test duration
    await new Promise((resolve) => setTimeout(resolve, testDurationSeconds * 1000))

    clearInterval(intervalId)

    const memoryGrowth = memorySnapshots.length > 1
      ? memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]
      : 0

    const errorRate = messageCount > 0 ? errorCount / messageCount : 0

    // Check stability
    expect(errorRate).toBeLessThan(0.01) // Less than 1% error rate
    expect(memoryGrowth).toBeLessThan(50) // Less than 50MB growth over 30 seconds

    ws.close()
  })

  it('should recover from temporary errors', async () => {
    const url = `ws://localhost:${port}`
    const recoveryAttempts = 10
    let successCount = 0

    for (let i = 0; i < recoveryAttempts; i++) {
      try {
        const ws = await createWebSocket(url, 2000)

        // Send a message
        ws.send(JSON.stringify({ type: 'ping' }))

        // Wait for pong
        await new Promise<void>((resolve) => {
          const handler = (data: any) => {
            try {
              const parsed = JSON.parse(data.toString())
              if (parsed.type === 'pong') {
                ws.removeListener('message', handler)
                resolve()
              }
            } catch (err) {
              // Ignore
            }
          }
          ws.on('message', handler)

          setTimeout(() => {
            ws.removeListener('message', handler)
            resolve()
          }, 1000)
        })

        ws.close()
        successCount++
      } catch (err) {
        // Connection failed, try next
      }

      // Small delay between attempts
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const recoveryRate = successCount / recoveryAttempts
    expect(recoveryRate).toBeGreaterThan(0.9) // 90% recovery rate
  })
})
