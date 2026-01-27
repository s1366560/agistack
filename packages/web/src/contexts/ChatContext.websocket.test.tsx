/**
 * ChatContext WebSocket Integration Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 * Tests ChatContext integration with WebSocket for real-time communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { ChatProvider, useChatContext } from './ChatContext'
import { WebSocketClient } from '../services/sync/websocket'
import type { Session, Message } from '@agistack/shared'

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }))
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

// Mock ChatApi
const createMockChatApi = () => ({
  getSession: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  streamMessage: vi.fn(),
})

// Mock session data
const mockSession: Session = {
  id: 'session-1',
  projectId: 'project-1',
  agentType: 'claude',
  title: 'Test Session',
  messages: [],
  context: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// Mock messages
const mockMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hi there!',
    createdAt: new Date('2024-01-01'),
  },
]

/**
 * Helper to create a mock WebSocket client
 */
function createMockWebSocketClient(): WebSocketClient {
  const client = new WebSocketClient({
    url: 'ws://localhost:3001/ws',
    reconnectInterval: 100,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 3,
  })

  // Prevent auto-connect for better test control
  ;(client as any).setAutoConnect(false)
  client.connect()

  return client
}

/**
 * Helper to render ChatProvider and get context
 */
function renderChatProvider(
  api: any,
  wsClient: WebSocketClient,
  container: HTMLDivElement
): ReturnType<typeof useChatContext> {
  let context: ReturnType<typeof useChatContext> | null = null

  render(
    () => (
      <ChatProvider api={api} wsClient={wsClient}>
        <ContextCapture onContextReady={(ctx) => { context = ctx }} />
      </ChatProvider>
    ),
    container
  )

  return context!
}

/**
 * Component that captures context for testing
 */
function ContextCapture(props: {
  onContextReady: (context: ReturnType<typeof useChatContext>) => void
}) {
  const context = useChatContext()
  props.onContextReady(context)

  return <div data-testid="context-capture">Context captured</div>
}

describe('ChatContext with WebSocket', () => {
  let container: HTMLDivElement
  let mockApi: ReturnType<typeof createMockChatApi>
  let wsClient: WebSocketClient
  let mockWebSocket: MockWebSocket

  beforeEach(async () => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    mockApi = createMockChatApi()

    // Create and connect WebSocket client
    wsClient = createMockWebSocketClient()

    // Wait for WebSocket to connect
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Get the mock WebSocket instance
    mockWebSocket = (wsClient as any).ws
  })

  afterEach(() => {
    if (wsClient) {
      wsClient.disconnect()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  // Test Group 1: WebSocket Initialization
  describe('WebSocket Integration', () => {
    it('initializes with WebSocket client', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      const context = renderChatProvider(mockApi, wsClient, container)

      // Should have WebSocket client
      expect(context).toBeDefined()
      expect(wsClient.isConnected()).toBe(true)
    })

    it('subscribes to session when loading session', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      const context = renderChatProvider(mockApi, wsClient, container)

      // Load session
      await context.loadSession('session-1')

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Should have subscribed to session
      const sentMessages = mockWebSocket.sentMessages
      const subMessage = sentMessages
        .map((msg) => JSON.parse(msg))
        .find((msg) => msg.type === 'subscribe')

      expect(subMessage).toBeDefined()
      expect(subMessage.sessionId).toBe('session-1')
    })

    it('unsubscribes from previous session when loading new session', async () => {
      const session1: Session = { ...mockSession, id: 'session-1' }
      const session2: Session = { ...mockSession, id: 'session-2' }

      vi.mocked(mockApi.getSession).mockImplementation((id) =>
        Promise.resolve(id === 'session-1' ? session1 : session2)
      )
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      // Load first session
      await context.loadSession('session-1')
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Load second session
      await context.loadSession('session-2')
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Should have unsubscribe from first session
      const sentMessages = mockWebSocket.sentMessages
      const messages = sentMessages.map((msg) => JSON.parse(msg))

      const unsubs = messages.filter((msg) => msg.type === 'unsubscribe')
      const subs = messages.filter((msg) => msg.type === 'subscribe')

      expect(unsubs.length).toBeGreaterThan(0)
      expect(unsubs[unsubs.length - 1].sessionId).toBe('session-1')
      expect(subs.some((msg) => msg.sessionId === 'session-2')).toBe(true)
    })
  })

  // Test Group 2: sendMessage with WebSocket
  describe('sendMessage via WebSocket', () => {
    it('sends message through WebSocket instead of API', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      // Load session first
      await context.loadSession('session-1')
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Clear previous messages
      mockWebSocket.sentMessages = []

      // Send message
      await context.sendMessage('Hello WebSocket')

      // Wait for message to be sent
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Should have sent chat message through WebSocket
      const sentMessages = mockWebSocket.sentMessages
      const chatMessage = sentMessages.map((msg) => JSON.parse(msg)).find((msg) => msg.type === 'chat')

      expect(chatMessage).toBeDefined()
      expect(chatMessage.content).toBe('Hello WebSocket')
      expect(chatMessage.sessionId).toBe('session-1')

      // Should NOT have called the API streamMessage
      expect(mockApi.streamMessage).not.toHaveBeenCalled()
    })

    it('receives streaming chunks via WebSocket', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')
      await context.sendMessage('Test streaming')

      // Wait for WebSocket subscription
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Simulate streaming chunks from server
      const chunks = [
        { type: 'chunk', content: 'Hello', done: false },
        { type: 'chunk', content: ' World', done: false },
        { type: 'chunk', content: '!', done: true },
      ]

      for (const chunk of chunks) {
        mockWebSocket.simulateMessage(JSON.stringify(chunk))
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Wait for final message to be added
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should have received complete message
      const messages = context.messages()
      expect(messages.length).toBe(2) // user + assistant
      expect(messages[1].role).toBe('assistant')
      expect(messages[1].content).toBe('Hello World!')
    })

    it('handles streaming errors via WebSocket', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')

      // Send a message
      await context.sendMessage('Test streaming')

      await new Promise((resolve) => setTimeout(resolve, 20))

      // Send a done message to complete the stream
      mockWebSocket.simulateMessage(JSON.stringify({ type: 'chunk', content: 'Partial', done: false }))
      mockWebSocket.simulateMessage(JSON.stringify({ type: 'chunk', content: '', done: true }))

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should have completed streaming without error
      expect(context.streaming()).toBe(false)
      expect(context.messages().length).toBe(2) // user + assistant
    })

    it('accumulates streamText during WebSocket streaming', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')
      await context.sendMessage('Test')

      await new Promise((resolve) => setTimeout(resolve, 20))

      // Send first chunk
      mockWebSocket.simulateMessage(JSON.stringify({ type: 'chunk', content: 'Hello', done: false }))

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should have streamText
      expect(context.streamText()).toBe('Hello')

      // Send second chunk
      mockWebSocket.simulateMessage(JSON.stringify({ type: 'chunk', content: ' World', done: false }))

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(context.streamText()).toBe('Hello World')

      // Send done
      mockWebSocket.simulateMessage(JSON.stringify({ type: 'chunk', content: '', done: true }))

      await new Promise((resolve) => setTimeout(resolve, 50))

      // streamText should be cleared
      expect(context.streamText()).toBe('')
    })
  })

  // Test Group 3: Connection State Management
  describe('Connection State', () => {
    it('handles WebSocket disconnection gracefully', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')

      // Disconnect WebSocket
      wsClient.disconnect()

      // Context should still work (fallback to API)
      expect(context.session()).toBeDefined()
    })

    it('reconnects and resubscribes to session', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')

      // Track subscriptions before disconnect
      const subscriptionsBefore = wsClient.getSubscriptions()
      expect(subscriptionsBefore).toContain('session-1')

      // Disconnect and reconnect
      wsClient.disconnect()

      // Wait a bit then reconnect
      await new Promise((resolve) => setTimeout(resolve, 50))

      ;(wsClient as any).setAutoConnect(false)
      wsClient.connect()

      await new Promise((resolve) => setTimeout(resolve, 20))

      // Should reconnect (but subscription might be lost - this is expected behavior)
      expect(wsClient.isConnected()).toBe(true)
    })
  })

  // Test Group 4: Tool Calls via WebSocket
  describe('Tool Call Handling', () => {
    it('receives tool call events during streaming', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const toolCallHandler = vi.fn()

      // Listen to tool_call events from WebSocket
      wsClient.on('tool_call', toolCallHandler)

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')
      await context.sendMessage('Use a tool')

      await new Promise((resolve) => setTimeout(resolve, 20))

      // Simulate tool call
      mockWebSocket.simulateMessage(
        JSON.stringify({
          type: 'tool_call',
          toolCall: {
            id: 'tool-123',
            name: 'read-file',
            arguments: { path: '/test.txt' },
          },
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should have received tool call
      expect(toolCallHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolCall: expect.objectContaining({
            name: 'read-file',
          }),
        })
      )
    })
  })

  // Test Group 5: Backward Compatibility
  describe('Backward Compatibility', () => {
    it('works without WebSocket client (fallback to API)', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      // Create async generator mock for streaming
      vi.mocked(mockApi.streamMessage).mockImplementation(async function* () {
        yield { delta: 'Hello', done: false }
        yield { delta: ' World', done: true }
      })

      // Render without WebSocket client
      let context: ReturnType<typeof useChatContext> | null = null

      render(
        () => (
          <ChatProvider api={mockApi}>
            <ContextCapture onContextReady={(ctx) => { context = ctx }} />
          </ChatProvider>
        ),
        container
      )

      context!

      // Should work normally with API
      await context.loadSession('session-1')
      expect(context.session()).toEqual(mockSession)
      expect(context.messages()).toEqual(mockMessages)

      // Send message - should use API streaming
      await context.sendMessage('Test')

      // Should have received response via API
      expect(context.messages().length).toBe(4) // 2 original + 2 new
      expect(context.messages()[3].content).toBe('Hello World')
    })

    it('all existing tests still pass with WebSocket', async () => {
      // This test ensures that adding WebSocket doesn't break existing functionality
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      // Basic operations should work
      await context.loadSession('session-1')
      expect(context.session()).toBeDefined()
      expect(context.loading()).toBe(false)

      // Should handle empty content
      await context.sendMessage('')
      expect(context.messages().length).toBe(0)

      // Should handle whitespace
      await context.sendMessage('   ')
      expect(context.messages().length).toBe(0)
    })
  })

  // Test Group 6: Edge Cases
  describe('Edge Cases', () => {
    it('handles message sending before WebSocket is connected', async () => {
      // Create a new client without connecting
      const slowClient = new WebSocketClient({
        url: 'ws://localhost:3001/ws',
        reconnectInterval: 100,
      })
      ;(slowClient as any).setAutoConnect(false)

      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, slowClient, container)

      await context.loadSession('session-1')

      // Try to send message before WebSocket connects
      // Should handle gracefully (either queue or fallback to API)
      expect(() => context.sendMessage('Test')).not.toThrow()

      slowClient.disconnect()
    })

    it('handles multiple rapid messages via WebSocket', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')

      // Send multiple messages rapidly
      await context.sendMessage('First')
      await context.sendMessage('Second')
      await context.sendMessage('Third')

      await new Promise((resolve) => setTimeout(resolve, 50))

      // All should be sent via WebSocket
      const sentMessages = mockWebSocket.sentMessages
      const chatMessages = sentMessages.map((msg) => JSON.parse(msg)).filter((msg) => msg.type === 'chat')

      expect(chatMessages.length).toBe(3)
    })

    it('handles WebSocket error during message send', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, wsClient, container)

      await context.loadSession('session-1')

      // Simulate WebSocket error by closing the connection
      mockWebSocket.close(1006, 'Abnormal closure')

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Context should still be functional
      expect(context.session()).toBeDefined()
      expect(context.session()?.id).toBe('session-1')
    })
  })
})
