/**
 * WebSocket Metrics Collector
 *
 * Thread-safe metrics collection for WebSocket monitoring
 * Supports export to JSON and Prometheus formats
 */

/**
 * Metric types for categorization
 */
export enum MetricType {
  CONNECTION = 'connection',
  MESSAGE = 'message',
  ERROR = 'error',
}

/**
 * Connection metrics snapshot
 */
interface ConnectionMetrics {
  /** Total connections ever established */
  total: number
  /** Currently active connections */
  active: number
  /** Peak concurrent connections */
  peak: number
  /** Average connection duration in milliseconds */
  avgDuration: number
}

/**
 * Message metrics snapshot
 */
interface MessageMetrics {
  /** Total messages sent */
  sent: number
  /** Total messages received */
  received: number
  /** Messages sent grouped by type */
  sentByType: Record<string, number>
  /** Messages received grouped by type */
  receivedByType: Record<string, number>
  /** Messages per second throughput */
  throughput: number
  /** Latency statistics in milliseconds */
  latency: {
    min: number
    max: number
    avg: number
  }
}

/**
 * Error metrics snapshot
 */
interface ErrorMetrics {
  /** Total errors encountered */
  total: number
  /** Errors grouped by type */
  byType: Record<string, number>
  /** Error rate (errors / total operations) */
  rate: number
}

/**
 * Complete metrics snapshot
 */
export interface MetricsSnapshot {
  /** Connection metrics */
  connections: ConnectionMetrics
  /** Message metrics */
  messages: MessageMetrics
  /** Error metrics */
  errors: ErrorMetrics
  /** Snapshot timestamp */
  timestamp: number
}

/**
 * Connection tracking data
 */
interface ConnectionData {
  /** Connection timestamp */
  connectedAt: number
}

/**
 * WebSocket Metrics Collector Class
 *
 * Thread-safe collection and aggregation of WebSocket metrics
 */
export class WebSocketMetricsCollector {
  private connections: Map<string, ConnectionData> = new Map()
  private connectionMetrics: ConnectionMetrics = {
    total: 0,
    active: 0,
    peak: 0,
    avgDuration: 0,
  }

  private messageMetrics: MessageMetrics = {
    sent: 0,
    received: 0,
    sentByType: {},
    receivedByType: {},
    throughput: 0,
    latency: {
      min: Infinity,
      max: 0,
      avg: 0,
    },
  }

  private errorMetrics: ErrorMetrics = {
    total: 0,
    byType: {},
    rate: 0,
  }

  private latencySamples: number[] = []
  private completedDurations: number[] = []
  private startTime: number = Date.now()
  private totalOperations: number = 0

  /**
   * Record a new connection
   *
   * @param clientId - Unique client identifier
   */
  recordConnection(clientId: string = 'anonymous'): void {
    this.connections.set(clientId, {
      connectedAt: Date.now(),
    })

    this.connectionMetrics.total++
    this.connectionMetrics.active++

    if (this.connectionMetrics.active > this.connectionMetrics.peak) {
      this.connectionMetrics.peak = this.connectionMetrics.active
    }

    this.totalOperations++
  }

  /**
   * Record a disconnection
   *
   * @param clientId - Client identifier
   * @param connectedAt - Optional connection timestamp (for testing)
   */
  recordDisconnection(clientId: string, connectedAt?: number): void {
    const connection = this.connections.get(clientId)
    if (!connection) return

    const disconnectedAt = Date.now()
    const duration = connectedAt
      ? disconnectedAt - connectedAt
      : disconnectedAt - connection.connectedAt

    // Store duration for average calculation
    this.completedDurations.push(duration)

    // Calculate average of all completed connections
    const sum = this.completedDurations.reduce((a, b) => a + b, 0)
    this.connectionMetrics.avgDuration = sum / this.completedDurations.length

    this.connections.delete(clientId)
    this.connectionMetrics.active--
  }

  /**
   * Record a sent message
   *
   * @param type - Message type (e.g., 'chat', 'ping')
   */
  recordMessageSent(type: string): void {
    this.messageMetrics.sent++
    this.messageMetrics.sentByType[type] = (this.messageMetrics.sentByType[type] || 0) + 1
    this.totalOperations++
  }

  /**
   * Record a received message
   *
   * @param type - Message type (e.g., 'chunk', 'pong')
   */
  recordMessageReceived(type: string): void {
    this.messageMetrics.received++
    this.messageMetrics.receivedByType[type] = (this.messageMetrics.receivedByType[type] || 0) + 1
    this.totalOperations++
  }

  /**
   * Record message latency
   *
   * @param latencyMs - Latency in milliseconds
   */
  recordMessageLatency(latencyMs: number): void {
    this.latencySamples.push(latencyMs)

    if (latencyMs < this.messageMetrics.latency.min) {
      this.messageMetrics.latency.min = latencyMs
    }

    if (latencyMs > this.messageMetrics.latency.max) {
      this.messageMetrics.latency.max = latencyMs
    }

    // Update average
    const sum = this.latencySamples.reduce((a, b) => a + b, 0)
    this.messageMetrics.latency.avg = sum / this.latencySamples.length
  }

  /**
   * Record an error
   *
   * @param errorType - Type of error (e.g., 'PARSE_ERROR', 'VALIDATION_ERROR')
   */
  recordError(errorType: string): void {
    this.errorMetrics.total++
    this.errorMetrics.byType[errorType] = (this.errorMetrics.byType[errorType] || 0) + 1

    // Increment total operations first, then calculate error rate
    this.totalOperations++

    // Update error rate (errors / total operations)
    this.errorMetrics.rate = this.errorMetrics.total / this.totalOperations
  }

  /**
   * Get current metrics snapshot
   *
   * @returns Immutable metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000

    // Calculate current error rate
    const currentErrorRate = this.totalOperations > 0
      ? this.errorMetrics.total / this.totalOperations
      : 0

    return {
      connections: { ...this.connectionMetrics },
      messages: {
        ...this.messageMetrics,
        throughput: elapsedSeconds > 0 ? this.messageMetrics.sent / elapsedSeconds : 0,
        latency: {
          min: this.messageMetrics.latency.min === Infinity ? 0 : this.messageMetrics.latency.min,
          max: this.messageMetrics.latency.max,
          avg: this.messageMetrics.latency.avg,
        },
      },
      errors: {
        ...this.errorMetrics,
        rate: currentErrorRate,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Export metrics as JSON
   *
   * @returns JSON string of metrics
   */
  toJSON(): string {
    return JSON.stringify(this.getSnapshot(), null, 2)
  }

  /**
   * Get metrics as object (for testing)
   *
   * @returns Metrics object
   */
  toObject(): MetricsSnapshot {
    return this.getSnapshot()
  }

  /**
   * Export metrics in Prometheus format
   *
   * @returns Prometheus text format metrics
   */
  toPrometheus(): string {
    const snapshot = this.getSnapshot()
    const lines: string[] = []

    // Help text
    lines.push('# HELP websocket_connections_active Current number of active WebSocket connections')
    lines.push('# TYPE websocket_connections_active gauge')
    lines.push(`websocket_connections_active ${snapshot.connections.active}`)

    lines.push('# HELP websocket_connections_total Total number of WebSocket connections')
    lines.push('# TYPE websocket_connections_total counter')
    lines.push(`websocket_connections_total ${snapshot.connections.total}`)

    lines.push('# HELP websocket_connections_peak Peak number of concurrent connections')
    lines.push('# TYPE websocket_connections_peak gauge')
    lines.push(`websocket_connections_peak ${snapshot.connections.peak}`)

    lines.push('# HELP websocket_messages_sent_total Total number of messages sent')
    lines.push('# TYPE websocket_messages_sent_total counter')
    lines.push(`websocket_messages_sent_total ${snapshot.messages.sent}`)

    lines.push('# HELP websocket_messages_received_total Total number of messages received')
    lines.push('# TYPE websocket_messages_received_total counter')
    lines.push(`websocket_messages_received_total ${snapshot.messages.received}`)

    lines.push('# HELP websocket_messages_throughput Messages sent per second')
    lines.push('# TYPE websocket_messages_throughput gauge')
    lines.push(`websocket_messages_throughput ${snapshot.messages.throughput.toFixed(2)}`)

    lines.push('# HELP websocket_message_latency_avg Average message latency in milliseconds')
    lines.push('# TYPE websocket_message_latency_avg gauge')
    lines.push(`websocket_message_latency_avg ${snapshot.messages.latency.avg.toFixed(2)}`)

    lines.push('# HELP websocket_errors_total Total number of errors')
    lines.push('# TYPE websocket_errors_total counter')
    lines.push(`websocket_errors_total ${snapshot.errors.total}`)

    lines.push('# HELP websocket_error_rate Error rate (errors per operation)')
    lines.push('# TYPE websocket_error_rate gauge')
    lines.push(`websocket_error_rate ${snapshot.errors.rate.toFixed(4)}`)

    // Message types
    for (const [type, count] of Object.entries(snapshot.messages.sentByType)) {
      lines.push(
        `websocket_messages_sent_by_type{type="${type}"} ${count}`
      )
    }

    for (const [type, count] of Object.entries(snapshot.messages.receivedByType)) {
      lines.push(
        `websocket_messages_received_by_type{type="${type}"} ${count}`
      )
    }

    // Error types
    for (const [type, count] of Object.entries(snapshot.errors.byType)) {
      lines.push(
        `websocket_errors_by_type{type="${type}"} ${count}`
      )
    }

    return lines.join('\n')
  }

  /**
   * Reset all metrics to initial state
   */
  reset(): void {
    this.connections.clear()
    this.connectionMetrics = {
      total: 0,
      active: 0,
      peak: 0,
      avgDuration: 0,
    }

    this.messageMetrics = {
      sent: 0,
      received: 0,
      sentByType: {},
      receivedByType: {},
      throughput: 0,
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
      },
    }

    this.errorMetrics = {
      total: 0,
      byType: {},
      rate: 0,
    }

    this.latencySamples = []
    this.completedDurations = []
    this.startTime = Date.now()
    this.totalOperations = 0
  }
}
