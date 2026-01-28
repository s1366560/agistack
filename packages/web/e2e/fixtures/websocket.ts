/**
 * WebSocket Test Fixtures
 *
 * Provides mock WebSocket server and test data
 */

import { WebSocketMessage } from '../helpers/websocket'

/**
 * Mock WebSocket message types
 */
export const MockMessageTypes = {
  CHAT: 'chat',
  CHUNK: 'chunk',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
  AUTHENTICATED: 'authenticated',
  DONE: 'done',
  TOOL_CALL: 'tool_call',
} as const

/**
 * Mock chat messages
 */
export const MockChatMessages = {
  greeting: {
    type: MockMessageTypes.CHAT,
    data: { role: 'assistant', content: 'Hello! How can I help you?' },
  },
  error: {
    type: MockMessageTypes.ERROR,
    data: { code: 'INVALID_REQUEST', message: 'Invalid request parameters' },
  },
  chunk: {
    type: MockMessageTypes.CHUNK,
    data: { content: 'Test response chunk', index: 0 },
  },
  authenticated: {
    type: MockMessageTypes.AUTHENTICATED,
    data: { userId: 'test-user-123', timestamp: Date.now() },
  },
  done: {
    type: MockMessageTypes.DONE,
    data: { finishReason: 'stop', usage: { totalTokens: 100 } },
  },
}

/**
 * Message matcher utility
 */
export class MessageMatcher {
  /**
   * Match message by type
   */
  static byType(type: string): (msg: WebSocketMessage) => boolean {
    return (msg) => msg.type === type
  }

  /**
   * Match message by data
   */
  static byData(data: Partial<unknown>): (msg: WebSocketMessage) => boolean {
    return (msg) => {
      if (!msg.data || typeof msg.data !== 'object') return false
      for (const [key, value] of Object.entries(data)) {
        if ((msg.data as Record<string, unknown>)[key] !== value) {
          return false
        }
      }
      return true
    }
  }

  /**
   * Match message by type and data
   */
  static byTypeAndData(type: string, data: Partial<unknown>): (msg: WebSocketMessage) => boolean {
    return (msg) => {
      if (msg.type !== type) return false
      return MessageMatcher.byData(data)(msg)
    }
  }

  /**
   * Find message in array
   */
  static find(messages: WebSocketMessage[], matcher: (msg: WebSocketMessage) => boolean): WebSocketMessage | undefined {
    return messages.find(matcher)
  }

  /**
   * Filter messages
   */
  static filter(messages: WebSocketMessage[], matcher: (msg: WebSocketMessage) => boolean): WebSocketMessage[] {
    return messages.filter(matcher)
  }
}

/**
 * WebSocket event recorder
 */
export class WebSocketEventRecorder {
  private events: Array<{ type: string; data: unknown; timestamp: number }> = []

  /**
   * Record event
   */
  record(type: string, data: unknown): void {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Get all events
   */
  getEvents(): Array<{ type: string; data: unknown; timestamp: number }> {
    return [...this.events]
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): Array<{ type: string; data: unknown; timestamp: number }> {
    return this.events.filter((e) => e.type === type)
  }

  /**
   * Clear events
   */
  clear(): void {
    this.events = []
  }

  /**
   * Verify event occurred
   */
  verify(type: string, count?: number): boolean {
    const matching = this.getEventsByType(type)
    if (count === undefined) {
      return matching.length > 0
    }
    return matching.length === count
  }

  /**
   * Get event count
   */
  getEventCount(type?: string): number {
    if (type === undefined) {
      return this.events.length
    }
    return this.getEventsByType(type).length
  }

  /**
   * Verify event sequence
   */
  verifySequence(types: string[]): boolean {
    if (this.events.length < types.length) {
      return false
    }

    const eventTypes = this.events.slice(0, types.length).map((e) => e.type)
    return JSON.stringify(eventTypes) === JSON.stringify(types)
  }
}

/**
 * Create event recorder
 */
export function createRecorder(): WebSocketEventRecorder {
  return new WebSocketEventRecorder()
}

/**
 * Generate mock chat response
 */
export function generateMockChatResponse(content: string): WebSocketMessage {
  return {
    type: MockMessageTypes.CHAT,
    data: {
      role: 'assistant',
      content,
    },
    timestamp: Date.now(),
  }
}

/**
 * Generate mock chunk
 */
export function generateMockChunk(content: string, index: number): WebSocketMessage {
  return {
    type: MockMessageTypes.CHUNK,
    data: {
      content,
      index,
    },
    timestamp: Date.now(),
  }
}

/**
 * Generate mock error
 */
export function generateMockError(code: string, message: string): WebSocketMessage {
  return {
    type: MockMessageTypes.ERROR,
    data: {
      code,
      message,
    },
    timestamp: Date.now(),
  }
}

/**
 * Generate stream of chunks
 */
export function generateMockChunkStream(text: string, chunkSize = 10): WebSocketMessage[] {
  const chunks: WebSocketMessage[] = []
  const words = text.split(' ')

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    chunks.push(generateMockChunk(chunk, i / chunkSize))
  }

  return chunks
}

/**
 * Complete chat response with chunks
 */
export function generateCompleteChatResponse(text: string): WebSocketMessage[] {
  const messages: WebSocketMessage[] = []

  // Start message
  messages.push({
    type: 'start',
    data: { sessionId: 'test-session' },
    timestamp: Date.now(),
  })

  // Chunks
  messages.push(...generateMockChunkStream(text))

  // Done message
  messages.push({
    type: MockMessageTypes.DONE,
    data: {
      finishReason: 'stop',
      usage: { totalTokens: text.length },
    },
    timestamp: Date.now(),
  })

  return messages
}

/**
 * Verify message order
 */
export function verifyMessageOrder(messages: WebSocketMessage[], expectedTypes: string[]): boolean {
  if (messages.length !== expectedTypes.length) {
    return false
  }

  return messages.every((msg, index) => msg.type === expectedTypes[index])
}

/**
 * Calculate message statistics
 */
export function calculateMessageStats(messages: WebSocketMessage[]): {
  total: number
  byType: Record<string, number>
  firstTimestamp: number | undefined
  lastTimestamp: number | undefined
  duration: number | undefined
} {
  const byType: Record<string, number> = {}
  let firstTimestamp: number | undefined
  let lastTimestamp: number | undefined

  messages.forEach((msg) => {
    byType[msg.type] = (byType[msg.type] || 0) + 1

    if (msg.timestamp) {
      if (firstTimestamp === undefined || msg.timestamp < firstTimestamp) {
        firstTimestamp = msg.timestamp
      }
      if (lastTimestamp === undefined || msg.timestamp > lastTimestamp) {
        lastTimestamp = msg.timestamp
      }
    }
  })

  const duration =
    firstTimestamp && lastTimestamp ? lastTimestamp - firstTimestamp : undefined

  return {
    total: messages.length,
    byType,
    firstTimestamp,
    lastTimestamp,
    duration,
  }
}
