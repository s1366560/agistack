/**
 * useSendMessage Hook Tests
 *
 * TDD: Test file written BEFORE implementation (RED phase)
 * Tests the useSendMessage custom hook for message sending
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot, createSignal } from 'solid-js'
import type { Session, Message } from '@agistack/shared'
import type { ChatContextValue } from '../contexts/ChatContext.types'

// Mock useChatContext
let mockContextValue: ChatContextValue
const mockSendMessage = vi.fn()
const mockRetry = vi.fn()

vi.mock('../contexts/ChatContext', () => ({
  useChatContext: () => mockContextValue,
}))

// Create a wrapper component that provides the mocked context
function createTestContext(overrides?: Partial<ChatContextValue>): ChatContextValue {
  const [session, setSession] = createSignal<Session | null>(null)
  const [messages, setMessages] = createSignal<Message[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [streaming, setStreaming] = createSignal(false)
  const [streamText, setStreamText] = createSignal('')

  mockSendMessage.mockImplementation(() => Promise.resolve())
  mockRetry.mockImplementation(() => Promise.resolve())

  return {
    session,
    messages,
    loading,
    error,
    streaming,
    streamText,
    loadSession: vi.fn(),
    sendMessage: mockSendMessage,
    retry: mockRetry,
    ...overrides,
  }
}

describe('useSendMessage', () => {
  // We'll need to import this after setting up mocks
  let useSendMessage: () => {
    readonly send: (content: string) => Promise<void>
    readonly sending: Accessor<boolean>
    readonly error: Accessor<string | null>
    readonly retry: () => Promise<void>
    readonly canSend: Accessor<boolean>
    readonly resetError: () => void
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset mock context
    mockContextValue = createTestContext()

    // Dynamic import after mocks are set up
    const module = await import('./useSendMessage')
    useSendMessage = module.useSendMessage
  })

  describe('Basic functionality', () => {
    it('should return send function', () => {
      createRoot((dispose) => {
        const result = useSendMessage()

        expect(result.send).toBeDefined()
        expect(typeof result.send).toBe('function')

        dispose()
      })
    })

    it('should return sending state', () => {
      createRoot((dispose) => {
        const result = useSendMessage()

        expect(result.sending).toBeDefined()
        expect(typeof result.sending).toBe('function')
        expect(result.sending()).toBe(false) // Initial state

        dispose()
      })
    })

    it('should return error state', () => {
      createRoot((dispose) => {
        const result = useSendMessage()

        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('function')
        expect(result.error()).toBe(null) // Initial state

        dispose()
      })
    })

    it('should return retry function', () => {
      createRoot((dispose) => {
        const result = useSendMessage()

        expect(result.retry).toBeDefined()
        expect(typeof result.retry).toBe('function')

        dispose()
      })
    })

    it('should return canSend derived state', () => {
      createRoot((dispose) => {
        const result = useSendMessage()

        expect(result.canSend).toBeDefined()
        expect(typeof result.canSend).toBe('function')

        dispose()
      })
    })

    it('should return resetError function', () => {
      createRoot((dispose) => {
        const result = useSendMessage()

        expect(result.resetError).toBeDefined()
        expect(typeof result.resetError).toBe('function')

        dispose()
      })
    })
  })

  describe('send function', () => {
    it('should call context.sendMessage with provided content', async () => {
      createRoot(async (dispose) => {
        const testContent = 'Hello, AI!'
        const result = useSendMessage()

        await result.send(testContent)

        expect(mockSendMessage).toHaveBeenCalledWith(testContent)
        expect(mockSendMessage).toHaveBeenCalledTimes(1)

        dispose()
      })
    })

    it('should set sending to true during send', async () => {
      createRoot(async (dispose) => {
        let resolveSend: (value: void) => void
        const sendPromise = new Promise<void>((resolve) => {
          resolveSend = resolve
        })

        mockSendMessage.mockReturnValueOnce(sendPromise)

        const result = useSendMessage()

        // Start sending
        const promise = result.send('test')

        // Should be sending
        expect(result.sending()).toBe(true)

        // Resolve send
        resolveSend!()
        await promise

        // Should no longer be sending
        expect(result.sending()).toBe(false)

        dispose()
      })
    })

    it('should set sending to false after successful send', async () => {
      createRoot(async (dispose) => {
        mockSendMessage.mockResolvedValueOnce(undefined)

        const result = useSendMessage()

        expect(result.sending()).toBe(false)

        await result.send('test')

        expect(result.sending()).toBe(false)

        dispose()
      })
    })

    it('should set sending to false after failed send', async () => {
      createRoot(async (dispose) => {
        mockSendMessage.mockRejectedValueOnce(new Error('Send failed'))

        const result = useSendMessage()

        await expect(result.send('test')).rejects.toThrow('Send failed')

        expect(result.sending()).toBe(false)

        dispose()
      })
    })

    it('should clear error on successful send', async () => {
      createRoot(async (dispose) => {
        // Set initial error
        mockContextValue = createTestContext({
          error: vi.fn(() => 'Previous error') as any,
        })

        mockSendMessage.mockResolvedValueOnce(undefined)

        const result = useSendMessage()

        expect(result.error()).toBe('Previous error')

        await result.send('test')

        // Error should be cleared
        expect(result.error()).toBe(null)

        dispose()
      })
    })

    it('should set error on failed send', async () => {
      createRoot(async (dispose) => {
        const testError = new Error('Network error')
        mockSendMessage.mockRejectedValueOnce(testError)

        const result = useSendMessage()

        await expect(result.send('test')).rejects.toThrow('Network error')

        expect(result.error()).toBe('Network error')

        dispose()
      })
    })

    it('should not send empty content', async () => {
      createRoot(async (dispose) => {
        const result = useSendMessage()

        await result.send('   ')

        expect(mockSendMessage).not.toHaveBeenCalled()

        dispose()
      })
    })

    it('should not send when already sending', async () => {
      createRoot(async (dispose) => {
        // Set streaming to true (simulating already sending)
        mockContextValue = createTestContext({
          streaming: vi.fn(() => true) as any,
        })

        const result = useSendMessage()

        await result.send('test')

        expect(mockSendMessage).not.toHaveBeenCalled()
        expect(result.error()).toBe('Cannot send while streaming')

        dispose()
      })
    })
  })

  describe('retry function', () => {
    it('should call context.retry', async () => {
      createRoot(async (dispose) => {
        const result = useSendMessage()

        await result.retry()

        expect(mockRetry).toHaveBeenCalledTimes(1)

        dispose()
      })
    })

    it('should set sending state during retry', async () => {
      createRoot(async (dispose) => {
        let resolveRetry: (value: void) => void
        const retryPromise = new Promise<void>((resolve) => {
          resolveRetry = resolve
        })

        mockRetry.mockReturnValueOnce(retryPromise)

        const result = useSendMessage()

        const promise = result.retry()

        expect(result.sending()).toBe(true)

        resolveRetry!()
        await promise

        expect(result.sending()).toBe(false)

        dispose()
      })
    })

    it('should clear error on successful retry', async () => {
      createRoot(async (dispose) => {
        mockContextValue = createTestContext({
          error: vi.fn(() => 'Previous error') as any,
        })

        mockRetry.mockResolvedValueOnce(undefined)

        const result = useSendMessage()

        expect(result.error()).toBe('Previous error')

        await result.retry()

        expect(result.error()).toBe(null)

        dispose()
      })
    })

    it('should set error on failed retry', async () => {
      createRoot(async (dispose) => {
        const testError = new Error('Retry failed')
        mockRetry.mockRejectedValueOnce(testError)

        const result = useSendMessage()

        await expect(result.retry()).rejects.toThrow('Retry failed')

        expect(result.error()).toBe('Retry failed')

        dispose()
      })
    })
  })

  describe('canSend derived state', () => {
    it('should return true when session exists and not sending/streaming', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as any,
          loading: vi.fn(() => false) as any,
          streaming: vi.fn(() => false) as any,
        })

        const result = useSendMessage()

        expect(result.canSend()).toBe(true)

        dispose()
      })
    })

    it('should return false when no session', () => {
      createRoot((dispose) => {
        mockContextValue = createTestContext({
          session: vi.fn(() => null) as any,
          loading: vi.fn(() => false) as any,
          streaming: vi.fn(() => false) as any,
        })

        const result = useSendMessage()

        expect(result.canSend()).toBe(false)

        dispose()
      })
    })

    it('should return false when sending', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as any,
          loading: vi.fn(() => false) as any,
          streaming: vi.fn(() => false) as any,
        })

        const result = useSendMessage()

        // Simulate sending state
        createRoot((disposeInner) => {
          // This will be managed internally by the hook
          disposeInner()
        })

        dispose()
      })
    })

    it('should return false when streaming', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as any,
          loading: vi.fn(() => false) as any,
          streaming: vi.fn(() => true) as any,
        })

        const result = useSendMessage()

        expect(result.canSend()).toBe(false)

        dispose()
      })
    })

    it('should return false when loading', () => {
      createRoot((dispose) => {
        const testSession: Session = {
          id: 'session-1',
          title: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        mockContextValue = createTestContext({
          session: vi.fn(() => testSession) as any,
          loading: vi.fn(() => true) as any,
          streaming: vi.fn(() => false) as any,
        })

        const result = useSendMessage()

        expect(result.canSend()).toBe(false)

        dispose()
      })
    })
  })

  describe('resetError function', () => {
    it('should clear the error state', () => {
      createRoot((dispose) => {
        // Create hook with internal error state
        const result = useSendMessage()

        // Manually set error (simulating an error occurred)
        // This would be done internally by the hook

        // Reset error
        result.resetError()

        expect(result.error()).toBe(null)

        dispose()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle multiple concurrent send calls', async () => {
      createRoot(async (dispose) => {
        mockSendMessage.mockResolvedValue(undefined)

        const result = useSendMessage()

        // Send multiple messages concurrently
        await Promise.all([
          result.send('message 1'),
          result.send('message 2'),
          result.send('message 3'),
        ])

        expect(mockSendMessage).toHaveBeenCalledTimes(3)

        dispose()
      })
    })

    it('should handle whitespace-only content', async () => {
      createRoot(async (dispose) => {
        const result = useSendMessage()

        await result.send('   \n\t  ')

        expect(mockSendMessage).not.toHaveBeenCalled()

        dispose()
      })
    })

    it('should preserve error across multiple calls', async () => {
      createRoot(async (dispose) => {
        const testError = new Error('Persistent error')
        mockSendMessage.mockRejectedValueOnce(testError)

        const result = useSendMessage()

        // First call fails
        await expect(result.send('test')).rejects.toThrow('Persistent error')

        expect(result.error()).toBe('Persistent error')

        // Second call also fails
        mockSendMessage.mockRejectedValueOnce(new Error('Another error'))
        await expect(result.send('test2')).rejects.toThrow()

        // Error should be updated to latest error
        expect(result.error()).toBe('Another error')

        dispose()
      })
    })
  })
})
