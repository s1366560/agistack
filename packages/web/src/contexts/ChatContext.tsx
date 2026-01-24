/**
 * ChatContext Provider
 *
 * Manages chat sessions, messages, and streaming state.
 * Provides methods for loading sessions, sending messages, and handling retries.
 */

import {
  createContext,
  useContext,
  JSX,
  createSignal,
  batch,
} from 'solid-js'
import type { Session, Message, MessageChunk } from '@agistack/shared'
import type { ChatApi } from '../services/api/chat-api'
import type {
  ChatContextValue,
  ChatProviderProps,
  ChatInternalState,
} from './ChatContext.types'

/**
 * Create the ChatContext
 */
const ChatContext = createContext<ChatContextValue>()

/**
 * Trim whitespace from content for validation
 */
function trimContent(content: string): string {
  return content.trim()
}

/**
 * ChatContext Provider Component
 */
export function ChatProvider(props: ChatProviderProps): JSX.Element {
  // State signals
  const [session, setSession] = createSignal<Session | null>(null)
  const [messages, setMessages] = createSignal<Message[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [streaming, setStreaming] = createSignal(false)
  const [streamText, setStreamText] = createSignal('')

  // Internal state for retry functionality
  const internalState: ChatInternalState = {
    lastSessionId: null,
    lastMessageContent: null,
    lastOperation: null,
  }

  /**
   * Load a session by ID
   *
   * Fetches both the session and its messages from the API.
   * Updates state atomically using batch to prevent unnecessary re-renders.
   */
  const loadSession = async (id: string): Promise<void> => {
    // Store for retry
    internalState.lastSessionId = id
    internalState.lastOperation = 'loadSession'

    // Clear previous error and set loading
    batch(() => {
      setError(null)
      setLoading(true)
    })

    try {
      // Fetch session and messages in parallel
      const [sessionResult, messagesResult] = await Promise.all([
        props.api.getSession(id),
        props.api.getMessages(id),
      ])

      // Check if session exists
      if (!sessionResult) {
        batch(() => {
          setSession(null)
          setMessages([])
          setError('Session not found')
          setLoading(false)
        })
        return
      }

      // Update state with results
      batch(() => {
        setSession(sessionResult)
        setMessages(messagesResult)
        setLoading(false)
      })
    } catch (err) {
      // Handle errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      batch(() => {
        setSession(null)
        setMessages([])
        setError(errorMessage)
        setLoading(false)
      })
    }
  }

  /**
   * Send a message to the current session
   *
   * Adds the user message immediately, then streams the assistant's response.
   */
  const sendMessage = async (content: string): Promise<void> => {
    // Validate content
    const trimmedContent = trimContent(content)
    if (!trimmedContent) {
      return
    }

    // Check if session is loaded
    const currentSession = session()
    if (!currentSession) {
      setError('No session loaded')
      return
    }

    // Check if already loading
    if (loading()) {
      setError('Cannot send message while loading')
      return
    }

    // Store for retry
    internalState.lastMessageContent = trimmedContent
    internalState.lastOperation = 'sendMessage'

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: trimmedContent,
      createdAt: new Date(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])

    // Start streaming
    batch(() => {
      setError(null)
      setStreaming(true)
      setStreamText('')
    })

    try {
      // Stream the response
      let accumulatedText = ''

      for await (const chunk of props.api.streamMessage(currentSession.id, trimmedContent)) {
        if (chunk.delta) {
          accumulatedText += chunk.delta
          setStreamText(accumulatedText)
        }

        if (chunk.done) {
          break
        }
      }

      // Create assistant message with accumulated text
      const assistantMessage: Message = {
        role: 'assistant',
        content: accumulatedText,
        createdAt: new Date(),
      }

      // Add assistant message and clear streaming state
      batch(() => {
        setMessages((prev) => [...prev, assistantMessage])
        setStreaming(false)
        setStreamText('')
      })
    } catch (err) {
      // Handle streaming errors
      const errorMessage = err instanceof Error ? err.message : 'Stream failed'
      batch(() => {
        setError(errorMessage)
        setStreaming(false)
        setStreamText('')
      })
    }
  }

  /**
   * Retry the last failed operation
   *
   * Re-attempts the last loadSession or sendMessage call.
   */
  const retry = async (): Promise<void> => {
    const { lastOperation, lastSessionId, lastMessageContent } = internalState

    // Clear error before retry
    setError(null)

    if (lastOperation === 'loadSession' && lastSessionId) {
      await loadSession(lastSessionId)
    } else if (lastOperation === 'sendMessage' && lastMessageContent) {
      // Check if session is still available
      const currentSession = session()
      if (!currentSession) {
        setError('No session loaded for retry')
        return
      }

      // Remove the last user message (if any) before retrying
      const currentMessages = messages()
      if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'user') {
        setMessages((prev) => prev.slice(0, -1))
      }

      await sendMessage(lastMessageContent)
    } else {
      setError('Nothing to retry')
    }
  }

  /**
   * Create the context value
   */
  const contextValue: ChatContextValue = {
    // State
    session,
    messages,
    loading,
    error,
    streaming,
    streamText,

    // Actions
    loadSession,
    sendMessage,
    retry,
  }

  return <ChatContext.Provider value={contextValue}>{props.children}</ChatContext.Provider>
}

/**
 * Hook to use the ChatContext
 *
 * @throws {Error} If used outside of a ChatProvider
 * @returns {ChatContextValue} The chat context value
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }

  return context
}
