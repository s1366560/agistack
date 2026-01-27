/**
 * Performance Test Helpers
 *
 * Provides utilities for WebSocket performance testing
 */

import { WebSocket } from 'ws'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Performance baseline configuration
 */
export interface PerformanceBaseline {
  version: string
  lastUpdated: string
  baseline: {
    concurrentConnections: {
      target: number
      acceptableLatencyMs: number
      maxMemoryMB: number
      description: string
    }
    connectionStability: {
      cycles: number
      targetSuccessRate: number
      description: string
    }
    messageThroughput: {
      target: number
      messagesPerSecond: number
      maxLatencyMs: number
      description: string
    }
    streamingLatency: {
      targetLatencyMs: number
      chunkIntervalMs: number
      maxJitterMs: number
      description: string
    }
    longTermStability: {
      durationMinutes: number
      maxMemoryGrowthMB: number
      maxErrorRate: number
      description: string
    }
  }
  thresholds: {
    warning: number
    critical: number
  }
}

/**
 * Performance metrics result
 */
export interface PerformanceMetrics {
  testName: string
  timestamp: string
  duration: number
  metrics: Record<string, number | string>
  passed: boolean
  baseline: PerformanceBaseline
}

/**
 * Load performance baseline
 */
export function loadBaseline(): PerformanceBaseline {
  const baselinePath = join(__dirname, 'baseline.json')
  const content = readFileSync(baselinePath, 'utf-8')
  return JSON.parse(content) as PerformanceBaseline
}

/**
 * Calculate memory usage
 */
export function getMemoryUsageMB(): number {
  const usage = process.memoryUsage()
  return usage.heapUsed / (1024 * 1024)
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now()
  const result = await fn()
  const durationMs = Date.now() - start
  return { result, durationMs }
}

/**
 * Create WebSocket connection with timeout
 */
export async function createWebSocket(
  url: string,
  timeout = 5000
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    const timeoutId = setTimeout(() => {
      ws.close()
      reject(new Error(`WebSocket connection timeout after ${timeout}ms`))
    }, timeout)

    ws.on('open', () => {
      clearTimeout(timeoutId)
      resolve(ws)
    })

    ws.on('error', (error) => {
      clearTimeout(timeoutId)
      reject(error)
    })
  })
}

/**
 * Send message and wait for response
 */
export async function sendAndWait(
  ws: WebSocket,
  message: any,
  expectedType: string,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Message timeout after ${timeout}ms`))
    }, timeout)

    const handler = (data: any) => {
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === expectedType) {
          clearTimeout(timeoutId)
          ws.removeListener('message', handler)
          resolve(parsed)
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    ws.on('message', handler)
    ws.send(JSON.stringify(message))
  })
}

/**
 * Batch create WebSocket connections
 */
export async function createBatchConnections(
  url: string,
  count: number,
  concurrency = 10
): Promise<WebSocket[]> {
  const connections: WebSocket[] = []
  const batches = Math.ceil(count / concurrency)

  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(concurrency, count - i * concurrency)
    const batch = await Promise.all(
      Array.from({ length: batchSize }, () => createWebSocket(url))
    )
    connections.push(...batch)
  }

  return connections
}

/**
 * Close WebSocket connections gracefully
 */
export async function closeConnections(connections: WebSocket[]): Promise<void> {
  await Promise.all(
    connections.map(
      (ws) =>
        new Promise<void>((resolve) => {
          ws.on('close', () => resolve())
          ws.close()
          // Force close after 1 second
          setTimeout(() => resolve(), 1000)
        })
    )
  )
}

/**
 * Calculate statistics from array
 */
export function calculateStats(values: number[]): {
  min: number
  max: number
  avg: number
  median: number
  p95: number
  p99: number
} {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length

  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2

  const p95Index = Math.floor(sorted.length * 0.95)
  const p99Index = Math.floor(sorted.length * 0.99)

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    median,
    p95: sorted[p95Index],
    p99: sorted[p99Index],
  }
}

/**
 * Performance test result formatter
 */
export function formatPerformanceResult(result: PerformanceMetrics): string {
  const lines = [
    `Performance Test: ${result.testName}`,
    `Timestamp: ${result.timestamp}`,
    `Duration: ${result.duration}ms`,
    `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
    '',
    'Metrics:',
  ]

  for (const [key, value] of Object.entries(result.metrics)) {
    lines.push(`  ${key}: ${value}`)
  }

  return lines.join('\n')
}

/**
 * Compare against baseline and check if passed
 */
export function checkBaseline(
  metrics: Record<string, number>,
  baseline: PerformanceBaseline,
  testName: string
): { passed: boolean; details: string[] } {
  const details: string[] = []
  let passed = true

  if (testName === 'concurrentConnections') {
    const target = baseline.baseline.concurrentConnections.target
    const actual = metrics.connections || 0

    if (actual < target) {
      passed = false
      details.push(
        `❌ Connections: ${actual} < ${target} (target)`
      )
    } else {
      details.push(`✅ Connections: ${actual} >= ${target}`)
    }

    const latency = metrics.avgLatencyMs || 0
    const maxLatency = baseline.baseline.concurrentConnections.acceptableLatencyMs

    if (latency > maxLatency) {
      passed = false
      details.push(`❌ Latency: ${latency}ms > ${maxLatency}ms`)
    } else {
      details.push(`✅ Latency: ${latency}ms <= ${maxLatency}ms`)
    }
  }

  if (testName === 'connectionStability') {
    const successRate = metrics.successRate || 0
    const target = baseline.baseline.connectionStability.targetSuccessRate

    if (successRate < target) {
      passed = false
      details.push(`❌ Success rate: ${(successRate * 100).toFixed(1)}% < ${(target * 100).toFixed(1)}%`)
    } else {
      details.push(`✅ Success rate: ${(successRate * 100).toFixed(1)}% >= ${(target * 100).toFixed(1)}%`)
    }
  }

  if (testName === 'messageThroughput') {
    const throughput = metrics.messagesPerSecond || 0
    const target = baseline.baseline.messageThroughput.messagesPerSecond

    if (throughput < target) {
      passed = false
      details.push(`❌ Throughput: ${throughput} msg/s < ${target} msg/s`)
    } else {
      details.push(`✅ Throughput: ${throughput} msg/s >= ${target} msg/s`)
    }

    const latency = metrics.avgLatencyMs || 0
    const maxLatency = baseline.baseline.messageThroughput.maxLatencyMs

    if (latency > maxLatency) {
      passed = false
      details.push(`❌ Latency: ${latency}ms > ${maxLatency}ms`)
    } else {
      details.push(`✅ Latency: ${latency}ms <= ${maxLatency}ms`)
    }
  }

  if (testName === 'streamingLatency') {
    const latency = metrics.avgLatencyMs || 0
    const target = baseline.baseline.streamingLatency.targetLatencyMs

    if (latency > target) {
      passed = false
      details.push(`❌ Latency: ${latency}ms > ${target}ms`)
    } else {
      details.push(`✅ Latency: ${latency}ms <= ${target}ms`)
    }

    const jitter = metrics.jitterMs || 0
    const maxJitter = baseline.baseline.streamingLatency.maxJitterMs

    if (jitter > maxJitter) {
      passed = false
      details.push(`❌ Jitter: ${jitter}ms > ${maxJitter}ms`)
    } else {
      details.push(`✅ Jitter: ${jitter}ms <= ${maxJitter}ms`)
    }
  }

  if (testName === 'longTermStability') {
    const memoryGrowth = metrics.memoryGrowthMB || 0
    const maxGrowth = baseline.baseline.longTermStability.maxMemoryGrowthMB

    if (memoryGrowth > maxGrowth) {
      passed = false
      details.push(`❌ Memory growth: ${memoryGrowth}MB > ${maxGrowth}MB`)
    } else {
      details.push(`✅ Memory growth: ${memoryGrowth}MB <= ${maxGrowth}MB`)
    }

    const errorRate = metrics.errorRate || 0
    const maxErrorRate = baseline.baseline.longTermStability.maxErrorRate

    if (errorRate > maxErrorRate) {
      passed = false
      details.push(`❌ Error rate: ${(errorRate * 100).toFixed(2)}% > ${(maxErrorRate * 100).toFixed(2)}%`)
    } else {
      details.push(`✅ Error rate: ${(errorRate * 100).toFixed(2)}% <= ${(maxErrorRate * 100).toFixed(2)}%`)
    }
  }

  return { passed, details }
}
