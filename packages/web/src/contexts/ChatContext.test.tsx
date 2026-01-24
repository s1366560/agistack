/**
 * ChatContext Tests
 *
 * Test suite for the chat context provider
 * Following TDD methodology: tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'solid-js/web'
import { ChatProvider, useChatContext } from './ChatContext'
import { ChatApi } from '../services/api/chat-api'
import type { Session, Message, MessageChunk } from '@agistack/shared'

// Mock ChatApi
const createMockChatApi = (): ChatApi => {
  return {
    getSession: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    streamMessage: vi.fn(),
  } as unknown as ChatApi
}

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

// Mock message data
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

// Async generator mock for streaming
const createMockStream = (chunks: { delta: string; done?: boolean }[]) => {
  return async function* (): AsyncGenerator<MessageChunk> {
    for (const chunk of chunks) {
      yield { delta: chunk.delta, done: chunk.done ?? false } as MessageChunk
    }
  }
}

/**
 * Helper to render ChatProvider and get context
 */
function renderChatProvider(api: ChatApi, container: HTMLDivElement): ReturnType<typeof useChatContext> {
  let context: ReturnType<typeof useChatContext> | null = null

  render(
    () => (
      <ChatProvider api={api}>
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

describe('ChatContext', () => {
  let container: HTMLDivElement
  let mockApi: ChatApi

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    mockApi = createMockChatApi()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  // Test Group 1: Provider Initialization
  describe('Provider Initialization', () => {
    it('provides context with default initial state', () => {
      const context = renderChatProvider(mockApi, container)

      expect(context.session()).toBe(null)
      expect(context.messages()).toEqual([])
      expect(context.loading()).toBe(false)
      expect(context.error()).toBe(null)
      expect(context.streaming()).toBe(false)
      expect(context.streamText()).toBe('')
    })

    it('provides all required context properties', () => {
      const context = renderChatProvider(mockApi, container)

      // Check all state properties
      expect(context).toHaveProperty('session')
      expect(context).toHaveProperty('messages')
      expect(context).toHaveProperty('loading')
      expect(context).toHaveProperty('error')
      expect(context).toHaveProperty('streaming')
      expect(context).toHaveProperty('streamText')

      // Check all action methods
      expect(context).toHaveProperty('loadSession')
      expect(context).toHaveProperty('sendMessage')
      expect(context).toHaveProperty('retry')
    })

    it('throws error when useChatContext is used outside ChatProvider', () => {
      const testContainer = document.createElement('div')
      document.body.appendChild(testContainer)

      expect(() => {
        render(
          () => {
            const context = useChatContext()
            return <div>{context.session()?.id}</div>
          },
          testContainer
        )
      }).toThrow('useChatContext must be used within a ChatProvider')

      if (testContainer.parentNode) {
        testContainer.parentNode.removeChild(testContainer)
      }
    })
  })

  // Test Group 2: loadSession
  describe('loadSession', () => {
    it('successfully loads session and messages', async () => {
      const mockGetSession = vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      const mockGetMessages = vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      const context = renderChatProvider(mockApi, container)

      expect(context.loading()).toBe(false)

      await context.loadSession('session-1')

      expect(mockGetSession).toHaveBeenCalledWith('session-1')
      expect(mockGetMessages).toHaveBeenCalledWith('session-1')
      expect(context.session()).toEqual(mockSession)
      expect(context.messages()).toEqual(mockMessages)
      expect(context.loading()).toBe(false)
      expect(context.error()).toBe(null)
    })

    it('sets loading state during loadSession', async () => {
      let resolveLoading: () => void
      const loadingPromise = new Promise<void>((resolve) => {
        resolveLoading = resolve
      })

      vi.mocked(mockApi.getSession).mockImplementation(
        () => new Promise((resolve) => {
          loadingPromise.then(() => resolve(mockSession))
        })
      )
      vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      const context = renderChatProvider(mockApi, container)

      // Start loading
      const loadPromise = context.loadSession('session-1')

      // Wait a tick for loading to start
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(context.loading()).toBe(true)

      // Resolve the loading
      resolveLoading!()
      await loadPromise

      // Wait for promise to complete
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(context.loading()).toBe(false)
    })

    it('handles 404 error when session not found', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(null)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('nonexistent-session')

      expect(context.session()).toBe(null)
      expect(context.error()).toBe('Session not found')
      expect(context.loading()).toBe(false)
    })

    it('handles network error during loadSession', async () => {
      const networkError = new Error('Network error')

      vi.mocked(mockApi.getSession).mockRejectedValue(networkError)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      expect(context.session()).toBe(null)
      expect(context.error()).toBe('Network error')
      expect(context.loading()).toBe(false)
    })

    it('handles getMessages error after successful session load', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockRejectedValue(new Error('Failed to fetch messages'))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      expect(context.session()).toBe(null)
      expect(context.error()).toBe('Failed to fetch messages')
      expect(context.loading()).toBe(false)
    })

    it('updates state correctly on multiple loadSession calls', async () => {
      const session1: Session = { ...mockSession, id: 'session-1' }
      const session2: Session = { ...mockSession, id: 'session-2' }
      const messages1: Message[] = [{ ...mockMessages[0] }]
      const messages2: Message[] = [{ ...mockMessages[1] }]

      vi.mocked(mockApi.getSession).mockImplementation((id) =>
        Promise.resolve(id === 'session-1' ? session1 : session2)
      )
      vi.mocked(mockApi.getMessages).mockImplementation((id) =>
        Promise.resolve(id === 'session-1' ? messages1 : messages2)
      )

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')
      expect(context.session()?.id).toBe('session-1')
      expect(context.messages()).toEqual(messages1)

      await context.loadSession('session-2')
      expect(context.session()?.id).toBe('session-2')
      expect(context.messages()).toEqual(messages2)
    })

    it('clears previous error when loading new session', async () => {
      vi.mocked(mockApi.getSession).mockRejectedValueOnce(new Error('First error'))
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, container)

      // First load fails
      await context.loadSession('session-1')
      expect(context.error()).toBe('First error')

      // Second load succeeds
      vi.mocked(mockApi.getSession).mockResolvedValueOnce(mockSession)
      await context.loadSession('session-2')

      expect(context.error()).toBe(null)
    })
  })

  // Test Group 3: sendMessage
  describe('sendMessage', () => {
    it('adds user message to list and streams response', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      vi.mocked(mockApi.streamMessage).mockImplementation(async function* () {
        yield { delta: 'Hello', done: false } as MessageChunk
        yield { delta: ' world', done: false } as MessageChunk
        yield { delta: '!', done: true } as MessageChunk
      })

      const context = renderChatProvider(mockApi, container)

      // Load session first
      await context.loadSession('session-1')

      expect(context.messages()).toHaveLength(0)

      // Send message
      await context.sendMessage('Hi there')

      // User message should be added
      expect(context.messages()).toHaveLength(2)
      expect(context.messages()[0].role).toBe('user')
      expect(context.messages()[0].content).toBe('Hi there')

      // Assistant message should be added
      expect(context.messages()[1].role).toBe('assistant')
      expect(context.messages()[1].content).toBe('Hello world!')

      // Stream state should be cleared
      expect(context.streaming()).toBe(false)
      expect(context.streamText()).toBe('')
    })

    it('updates streamText during streaming', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      vi.mocked(mockApi.streamMessage).mockImplementation(
        createMockStream([
          { delta: 'Hello', done: false },
          { delta: ' world', done: false },
          { delta: '!', done: true },
        ])
      )

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')
      await context.sendMessage('test')

      // After streaming completes, streamText should be cleared
      expect(context.streamText()).toBe('')
    })

    it('sets streaming state correctly', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const streamChunks = [{ delta: 'Response', done: true }]
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream(streamChunks))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      expect(context.streaming()).toBe(false)

      await context.sendMessage('test')

      expect(context.streaming()).toBe(false)
    })

    it('handles sendMessage when no session is loaded', async () => {
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([]))

      const context = renderChatProvider(mockApi, container)

      await context.sendMessage('test')

      expect(context.error()).toBe('No session loaded')
      expect(context.messages()).toHaveLength(0)
    })

    it('handles streaming error', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      vi.mocked(mockApi.streamMessage).mockImplementation(async function* () {
        yield { delta: 'Partial', done: false }
        throw new Error('Stream interrupted')
      })

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      await context.sendMessage('test')

      expect(context.error()).toBe('Stream interrupted')
      expect(context.streaming()).toBe(false)
    })

    it('handles empty content by ignoring', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      await context.sendMessage('')

      // Should not call streamMessage
      expect(mockApi.streamMessage).not.toHaveBeenCalled()
      expect(context.messages()).toHaveLength(0)
    })

    it('handles whitespace-only content by ignoring', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      await context.sendMessage('   ')

      expect(mockApi.streamMessage).not.toHaveBeenCalled()
      expect(context.messages()).toHaveLength(0)
    })

    it('prevents sending while loading', async () => {
      let resolveGetSession: () => void
      const sessionPromise = new Promise<void>((resolve) => {
        resolveGetSession = resolve
      })

      vi.mocked(mockApi.getSession).mockImplementation(
        () => new Promise((resolve) => sessionPromise.then(() => resolve(mockSession)))
      )
      vi.mocked(mockApi.getMessages).mockResolvedValue([])
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([]))

      const context = renderChatProvider(mockApi, container)

      // Load a session first to establish a valid session
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      await context.loadSession('session-1')

      // Now mock a slow loading state for a second loadSession
      vi.mocked(mockApi.getSession).mockImplementation(
        () => new Promise((resolve) => sessionPromise.then(() => resolve(mockSession)))
      )

      // Start loading session (which sets loading to true)
      const loadPromise = context.loadSession('session-2')

      // Wait for loading to start
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Try to send message while loading - session is still loaded from before
      await context.sendMessage('test')

      expect(context.error()).toBe('Cannot send message while loading')

      // Resolve the session load
      resolveGetSession!()
      await loadPromise
    })

    it('appends new messages to existing list', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([{ delta: 'New response', done: true }]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      expect(context.messages()).toHaveLength(2)

      await context.sendMessage('New message')

      expect(context.messages()).toHaveLength(4)
      expect(context.messages()[2].role).toBe('user')
      expect(context.messages()[2].content).toBe('New message')
      expect(context.messages()[3].role).toBe('assistant')
      expect(context.messages()[3].content).toBe('New response')
    })
  })

  // Test Group 4: retry
  describe('retry', () => {
    it('retries loadSession after previous error', async () => {
      vi.mocked(mockApi.getSession).mockRejectedValueOnce(new Error('Network error'))
      vi.mocked(mockApi.getMessages).mockResolvedValue(mockMessages)

      const context = renderChatProvider(mockApi, container)

      // First attempt fails
      await context.loadSession('session-1')
      expect(context.error()).toBe('Network error')

      // Mock success for retry
      vi.mocked(mockApi.getSession).mockResolvedValueOnce(mockSession)

      // Retry
      await context.retry()

      expect(context.session()).toEqual(mockSession)
      expect(context.messages()).toEqual(mockMessages)
      expect(context.error()).toBe(null)
    })

    it('retries sendMessage after previous error', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      vi.mocked(mockApi.streamMessage).mockImplementation(
        async function* () {
          yield { delta: 'Before error', done: false }
          throw new Error('Stream failed')
        }
      )

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      // First send fails
      await context.sendMessage('test')
      expect(context.error()).toBe('Stream failed')

      // Mock success for retry
      vi.mocked(mockApi.streamMessage).mockImplementation(
        createMockStream([{ delta: 'Success response', done: true }])
      )

      // Retry
      await context.retry()

      expect(context.error()).toBe(null)
      expect(context.messages()).toHaveLength(2)
      expect(context.messages()[1].content).toBe('Success response')
    })

    it('handles retry when no previous operation to retry', async () => {
      const context = renderChatProvider(mockApi, container)

      await context.retry()

      expect(context.error()).toBe('Nothing to retry')
    })

    it('clears error state on successful retry', async () => {
      vi.mocked(mockApi.getSession).mockRejectedValueOnce(new Error('First error'))
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')
      expect(context.error()).toBe('First error')

      vi.mocked(mockApi.getSession).mockResolvedValueOnce(mockSession)

      await context.retry()

      expect(context.error()).toBe(null)
    })
  })

  // Test Group 5: Edge Cases
  describe('Edge Cases', () => {
    it('handles rapid state changes', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([{ delta: 'Response', done: true }]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')
      await context.sendMessage('First')
      await context.sendMessage('Second')
      await context.sendMessage('Third')

      expect(context.messages()).toHaveLength(6)
    })

    it('handles stream interruption', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      vi.mocked(mockApi.streamMessage).mockImplementation(
        async function* () {
          yield { delta: 'Partial', done: false }
          // Simulate abrupt termination (no final done: true)
        }
      )

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      await context.sendMessage('test')

      // Should handle incomplete streams
      expect(context.streaming()).toBe(false)
    })

    it('preserves session context across operations', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([{ delta: 'OK', done: true }]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      const sessionAfterLoad = context.session()

      await context.sendMessage('test')

      expect(context.session()).toBe(sessionAfterLoad)
      expect(context.session()?.id).toBe('session-1')
    })

    it('handles special characters in message content', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const specialContent = 'Test with <script>code</script> & "quotes" and \'apostrophes\''
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([{ delta: 'Response', done: true }]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      await context.sendMessage(specialContent)

      expect(context.messages()[0].content).toBe(specialContent)
    })

    it('handles very long message content', async () => {
      vi.mocked(mockApi.getSession).mockResolvedValue(mockSession)
      vi.mocked(mockApi.getMessages).mockResolvedValue([])

      const longContent = 'A'.repeat(10000)
      vi.mocked(mockApi.streamMessage).mockImplementation(createMockStream([{ delta: 'Response', done: true }]))

      const context = renderChatProvider(mockApi, container)

      await context.loadSession('session-1')

      await context.sendMessage(longContent)

      expect(context.messages()[0].content).toBe(longContent)
    })
  })
})
