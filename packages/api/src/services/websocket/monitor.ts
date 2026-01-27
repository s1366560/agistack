/**
 * WebSocket Monitor
 *
 * Monitors WebSocket metrics and evaluates health status
 * Supports configurable thresholds and alerting
 */

import { WebSocketMetricsCollector, MetricsSnapshot } from './metrics'

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Monitoring thresholds
 */
export interface MonitorThresholds {
  /** Maximum error rate (0-1) before alert */
  maxErrorRate: number
  /** Maximum message latency in ms before alert */
  maxLatency: number
  /** Minimum throughput (messages/sec) before alert */
  minThroughput: number
  /** Maximum active connections before alert (0 = no limit) */
  maxConnections: number
  /** Maximum memory usage percentage before alert */
  maxMemoryUsage: number
}

/**
 * Alert information
 */
export interface Alert {
  timestamp: number
  severity: 'warning' | 'critical'
  metric: string
  currentValue: number
  threshold: number
  message: string
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus
  timestamp: number
  metrics: MetricsSnapshot
  alerts: Alert[]
  recommendations: string[]
}

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /** Metrics collector to monitor */
  metricsCollector: WebSocketMetricsCollector
  /** Check interval in milliseconds */
  checkInterval: number
  /** Monitoring thresholds */
  thresholds: MonitorThresholds
  /** Alert callback function */
  onAlert?: (alert: Alert) => void
}

/**
 * WebSocket Monitor Class
 *
 * Monitors WebSocket metrics and evaluates health status based on thresholds
 */
export class WebSocketMonitor {
  private config: MonitorConfig
  private intervalId: ReturnType<typeof setInterval> | null = null
  private alerts: Alert[] = []

  constructor(config: MonitorConfig) {
    this.config = config
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.intervalId !== null) {
      return // Already running
    }

    this.intervalId = setInterval(() => {
      const result = this.checkHealth()

      // Trigger alert callbacks for new alerts
      result.alerts.forEach(alert => {
        if (this.config.onAlert) {
          this.config.onAlert(alert)
        }
      })
    }, this.config.checkInterval)
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Perform health check
   */
  checkHealth(): HealthCheckResult {
    const metrics = this.config.metricsCollector.getSnapshot()
    const alerts: Alert[] = []
    const recommendations: string[] = []

    // Check error rate
    if (metrics.errors.rate > this.config.thresholds.maxErrorRate) {
      alerts.push({
        timestamp: Date.now(),
        severity: metrics.errors.rate > this.config.thresholds.maxErrorRate * 2 ? 'critical' : 'warning',
        metric: 'error_rate',
        currentValue: metrics.errors.rate,
        threshold: this.config.thresholds.maxErrorRate,
        message: `Error rate ${(metrics.errors.rate * 100).toFixed(2)}% exceeds threshold ${(this.config.thresholds.maxErrorRate * 100).toFixed(2)}%`,
      })
      recommendations.push('Review error logs and fix common issues. Consider implementing better input validation.')
    }

    // Check latency (only if we have samples)
    if (metrics.messages.latency.avg > 0 && metrics.messages.latency.avg > this.config.thresholds.maxLatency) {
      alerts.push({
        timestamp: Date.now(),
        severity: metrics.messages.latency.avg > this.config.thresholds.maxLatency * 2 ? 'critical' : 'warning',
        metric: 'latency',
        currentValue: metrics.messages.latency.avg,
        threshold: this.config.thresholds.maxLatency,
        message: `Average latency ${metrics.messages.latency.avg.toFixed(0)}ms exceeds threshold ${this.config.thresholds.maxLatency}ms`,
      })
      recommendations.push('Optimize message processing. Consider implementing message batching or async processing.')
    }

    // Check throughput (only if we have sent messages)
    if (this.config.thresholds.minThroughput > 0 && metrics.messages.sent > 0 &&
        metrics.messages.throughput < this.config.thresholds.minThroughput) {
      alerts.push({
        timestamp: Date.now(),
        severity: 'warning',
        metric: 'throughput',
        currentValue: metrics.messages.throughput,
        threshold: this.config.thresholds.minThroughput,
        message: `Throughput ${metrics.messages.throughput.toFixed(2)} msg/s below minimum ${this.config.thresholds.minThroughput} msg/s`,
      })
      recommendations.push('Low throughput detected. Check if message processing is delayed.')
    }

    // Check connections
    if (this.config.thresholds.maxConnections > 0 &&
        metrics.connections.active > this.config.thresholds.maxConnections) {
      alerts.push({
        timestamp: Date.now(),
        severity: 'critical',
        metric: 'connections',
        currentValue: metrics.connections.active,
        threshold: this.config.thresholds.maxConnections,
        message: `Active connections ${metrics.connections.active} exceeds limit ${this.config.thresholds.maxConnections}`,
      })
      recommendations.push('Connection limit exceeded. Consider scaling or implementing connection pooling.')
    }

    // Check memory usage
    const memUsage = process.memoryUsage()
    const memoryPercentage = memUsage.heapTotal > 0
      ? (memUsage.heapUsed / memUsage.heapTotal) * 100
      : 0

    if (memoryPercentage > this.config.thresholds.maxMemoryUsage) {
      alerts.push({
        timestamp: Date.now(),
        severity: memoryPercentage > 95 ? 'critical' : 'warning',
        metric: 'memory_usage',
        currentValue: memoryPercentage,
        threshold: this.config.thresholds.maxMemoryUsage,
        message: `Memory usage ${memoryPercentage.toFixed(1)}% exceeds threshold ${this.config.thresholds.maxMemoryUsage}%`,
      })
      recommendations.push('High memory usage detected. Check for memory leaks and consider implementing memory limits.')
    }

    // Store alerts
    this.alerts.push(...alerts)

    // Determine overall health status based on current alerts only
    let status: HealthStatus
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    const warningAlerts = alerts.filter(a => a.severity === 'warning')

    if (criticalAlerts.length > 0) {
      status = HealthStatus.UNHEALTHY
    } else if (warningAlerts.length > 0) {
      status = HealthStatus.DEGRADED
    } else {
      status = HealthStatus.HEALTHY
    }

    return {
      status,
      timestamp: Date.now(),
      metrics,
      alerts, // Return only current alerts, not all stored alerts
      recommendations,
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit?: number): Alert[] {
    if (limit) {
      return this.alerts.slice(-limit)
    }
    return [...this.alerts]
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitorConfig>): void {
    const wasRunning = this.intervalId !== null

    if (wasRunning) {
      this.stop()
    }

    this.config = { ...this.config, ...config }

    if (wasRunning) {
      this.start()
    }
  }
}

/**
 * Default thresholds
 */
export const DEFAULT_THRESHOLDS: MonitorThresholds = {
  maxErrorRate: 0.05, // 5%
  maxLatency: 1000, // 1 second
  minThroughput: 0, // No minimum
  maxConnections: 0, // No limit
  maxMemoryUsage: 90, // 90%
}
