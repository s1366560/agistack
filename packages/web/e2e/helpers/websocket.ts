/**
 * WebSocket E2E Test Helpers
 *
 * Provides WebSocket testing utilities for E2E tests
 */

import { Page } from '@playwright/test'

/**
 * WebSocket message type
 */
export interface WebSocketMessage {
  type: string
  data: unknown
  timestamp?: number
}

/**
 * WebSocket test helper options
 */
export interface WebSocketHelperOptions {
  url: string
  protocols?: string | string[]
  reconnectInterval?: number
  messageTimeout?: number
}

/**
 * WebSocket connection state
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * WebSocket Test Helper Class
 *
 * Provides utilities for testing WebSocket connections in E2E tests
 */
export class WebSocketTestHelper {
  private ws: WebSocket | null = null
  private page: Page
  private options: WebSocketHelperOptions
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private messages: WebSocketMessage[] = []
  private messageHandlers: Map<string, (data: unknown) => void> = new Map()

  constructor(page: Page, options: WebSocketHelperOptions) {
    this.page = page
    this.options = {
      reconnectInterval: 1000,
      messageTimeout: 5000,
      ...options,
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    this.state = ConnectionState.CONNECTING

    // Create WebSocket in page context
    await this.page.evaluate(
      ({ url, protocols }) => {
        return new Promise((resolve, reject) => {
          try {
            const ws = new WebSocket(url, protocols)

            ws.addEventListener('open', () => {
              // Store ws on window for test access
              (window as any).__testWebSocket = ws
              resolve(true)
            })

            ws.addEventListener('error', (error) => {
              reject(error)
            })
          } catch (err) {
            reject(err)
        })
      },
      { url: this.options.url, protocols: this.options.protocols }
    )

    this.state = ConnectionState.CONNECTED

    // Setup message listener
    await this.page.evaluate(() => {
      const ws = (window as any).__testWebSocket
      if (!ws) return

      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data)
          // Store messages
          if (!(window as any).__testWebSocketMessages) {
            ;(window as any).__testWebSocketMessages = []
          }
          ;(window as any).__testWebSocketMessages.push({
            ...message,
            timestamp: Date.now(),
          })
        } catch (err) {
          // Ignore non-JSON messages
        }
      })

      ws.addEventListener('close', () => {
        if ((window as any).__testWebSocketClosed) {
          ;(window as any).__testWebSocketClosed()
        }
      })
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    await this.page.evaluate(() => {
      const ws = (window as any).__testWebSocket
      if (ws) {
        ws.close()
      }
    })
    this.state = ConnectionState.DISCONNECTED
  }

  /**
   * Send message to WebSocket server
   */
  async send(type: string, data: unknown): Promise<void> {
    const message = { type, data }
    await this.page.evaluate(
      ({ message }) => {
        const ws = (window as any).__testWebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message))
        }
      },
      { message }
    )
  }

  /**
   * Wait for message with specific type
   */
  async waitForMessage(type: string, timeout?: number): Promise<WebSocketMessage> {
    const timeoutMs = timeout ?? this.options.messageTimeout
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const messages = await this.getMessages()
      const found = messages.find((m) => m.type === type)
      if (found) {
        return found
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new Error(`Timeout waiting for message type: ${type}`)
  }

  /**
   * Get all received messages
   */
  async getMessages(): Promise<WebSocketMessage[]> {
    return await this.page.evaluate(() => {
      return (window as any).__testWebSocketMessages || []
    })
  }

  /**
   * Get messages by type
   */
  async getMessagesByType(type: string): Promise<WebSocketMessage[]> {
    const messages = await this.getMessages()
    return messages.filter((m) => m.type === type)
  }

  /**
   * Clear message history
   */
  async clearMessages(): Promise<void> {
    await this.page.evaluate(() => {
      ;(window as any).__testWebSocketMessages = []
    })
    this.messages = []
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Register message handler
   */
  on(type: string, handler: (data: unknown) => void): void {
    this.messageHandlers.set(type, handler)
  }

  /**
   * Wait for connection state
   */
  async waitForState(state: ConnectionState, timeout = 5000): Promise<void> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      if (this.state === state) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`Timeout waiting for state: ${state}`)
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    await this.disconnect()
    await this.clearMessages()
    this.messageHandlers.clear()
  }
}

/**
 * Create WebSocket test helper from page
 */
export function createWebSocketHelper(page: Page, url: string): WebSocketTestHelper {
  return new WebSocketTestHelper(page, { url })
}

/**
 * Wait for WebSocket connection in page
 */
export async function waitForWebSocketConnection(page: Page, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const ws = (window as any).__testWebSocket
        return ws && ws.readyState === WebSocket.OPEN
      },
      { timeout }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Get WebSocket messages from page context
 */
export async function getPageWebSocketMessages(page: Page): Promise<WebSocketMessage[]> {
  return await page.evaluate(() => {
    return (window as any).__testWebSocketMessages || []
  })
}

/**
 * Inject WebSocket interceptor into page
 */
export async function injectWebSocketInterceptor(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket

    // Override WebSocket constructor
    window.WebSocket = function (this: any, ...args: any[]) {
      const ws = new OriginalWebSocket(...args)
      ;(window as any).__testWebSocket = ws

      // Setup message tracking
      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data)
          if (!(window as any).__testWebSocketMessages) {
            ;(window as any).__testWebSocketMessages = []
          }
          ;(window as any).__testWebSocketMessages.push({
            ...message,
            timestamp: Date.now(),
          })
        } catch (err) {
          // Ignore non-JSON messages
        }
      })

      return ws
    } as any

    // Copy prototype
    window.WebSocket.prototype = OriginalWebSocket.prototype
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING
    window.WebSocket.OPEN = OriginalWebSocket.OPEN
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED
  })
}
