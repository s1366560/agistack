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
  onCleanup,
} from 'solid-js'
import type { Session, Message, MessageChunk } from '@agistack/shared'
import type { ChatApi } from '../services/api/chat-api'
import type { WebSocketClient } from '../services/sync/websocket'
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

  // WebSocket client (optional)
  const wsClient = props.wsClient

  // Internal state for retry functionality
  const internalState: ChatInternalState = {
    lastSessionId: null,
    lastMessageContent: null,
    lastOperation: null,
  }

  // Cleanup on unmount
  onCleanup(() => {
    // Unsubscribe from session if using WebSocket
    if (wsClient && internalState.lastSessionId) {
      try {
        wsClient.unsubscribeFromSession(internalState.lastSessionId)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  })

  /**
   * Load a session by ID
   *
   * Fetches both the session and its messages from the API.
   * Updates state atomically using batch to prevent unnecessary re-renders.
   * If WebSocket client is available, subscribes to the session for real-time updates.
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
      // Fetch session with messages in a single call
      const result = await props.api.getSessionWithMessages(id)

      // Check if session exists
      if (!result) {
        batch(() => {
          setSession(null)
          setMessages([])
          setError('Session not found')
          setLoading(false)
        })
        return
      }

      const { session: sessionResult, messages: messagesResult } = result

      // Unsubscribe from previous session if using WebSocket
      const previousSessionId = session()?.id
      if (wsClient && previousSessionId && previousSessionId !== id) {
        try {
          wsClient.unsubscribeFromSession(previousSessionId)
        } catch (error) {
          // Ignore unsubscribe errors
          console.warn('Failed to unsubscribe from previous session:', error)
        }
      }

      // Subscribe to new session if using WebSocket and connected
      if (wsClient && wsClient.isConnected()) {
        try {
          wsClient.subscribeToSession(id)
        } catch (error) {
          // Log but don't fail - continue with API polling as fallback
          console.warn('Failed to subscribe to session via WebSocket:', error)
        }
      }

      // Update state with results
      batch(() => {
        setSession(sessionResult)
        setMessages(messagesResult)
        setLoading(false)
      })
    } catch (err) {
      // Handle errors
      console.error('[ChatContext] Error in loadSession:', err)
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
   * Adds the user message immediately, then streams the assistant's response via WebSocket.
   * Requires WebSocket client to be connected.
   */
  const sendMessage = async (content: string): Promise<void> => {
    console.log('[ChatContext] sendMessage called with content:', content);

    // Validate content
    const trimmedContent = trimContent(content)
    console.log('[ChatContext] Trimmed content:', trimmedContent);

    if (!trimmedContent) {
      console.log('[ChatContext] Empty content, returning');
      return
    }

    // Check if session is loaded
    const currentSession = session()
    console.log('[ChatContext] Current session:', currentSession);

    if (!currentSession) {
      console.error('[ChatContext] No session loaded');
      setError('No session loaded')
      return
    }

    // Check if already loading
    if (loading()) {
      console.error('[ChatContext] Already loading');
      setError('Cannot send message while loading')
      return
    }

    // Check if WebSocket is available
    console.log('[ChatContext] wsClient:', wsClient);

    if (!wsClient) {
      console.error('[ChatContext] WebSocket client not available');
      setError('WebSocket client not available. Please refresh the page.')
      return
    }

    // Check if WebSocket is connected
    const isConnected = wsClient.isConnected()
    console.log('[ChatContext] WebSocket connected:', isConnected);

    if (!isConnected) {
      console.error('[ChatContext] WebSocket disconnected');
      setError('WebSocket disconnected. Reconnecting...')
      // Try to reconnect
      wsClient.connect()
      // Note: In production, you might want to wait for reconnection
      return
    }

    console.log('[ChatContext] All checks passed, proceeding to send message');

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
      // Send message via WebSocket
      wsClient.sendChatMessage(currentSession.id, trimmedContent)

      // Set up listeners for streaming chunks
      const chunkHandler = (data: any) => {
        if (data.sessionId === currentSession.id) {
          if (data.type === 'chunk') {
            const currentText = streamText()

            if (data.content) {
              setStreamText(currentText + data.content)
            }
          } else if (data.type === 'done') {
            // Streaming complete - add assistant message
            const finalText = streamText()
            const assistantMessage: Message = {
              role: 'assistant',
              content: finalText,
              createdAt: new Date(),
            }

            batch(() => {
              setMessages((prev) => [...prev, assistantMessage])
              setStreaming(false)
              setStreamText('')
            })

            // Clean up listeners
            wsClient.off('chunk', chunkHandler)
            wsClient.off('done', doneHandler)
            wsClient.off('error', errorHandler)
          }
        }
      }

      const doneHandler = (data: any) => {
        if (data.sessionId === currentSession.id && data.type === 'done') {
          // Handle done message
          const finalText = streamText()
          const assistantMessage: Message = {
            role: 'assistant',
            content: finalText,
            createdAt: new Date(),
          }

          batch(() => {
            setMessages((prev) => [...prev, assistantMessage])
            setStreaming(false)
            setStreamText('')
          })

          // Clean up listeners
          wsClient.off('chunk', chunkHandler)
          wsClient.off('done', doneHandler)
          wsClient.off('error', errorHandler)
        }
      }

      const errorHandler = (error: any) => {
        // Check if error is for this session
        const errorMessage = error?.message || 'Stream failed'
        batch(() => {
          setError(errorMessage)
          setStreaming(false)
          setStreamText('')
        })

        // Clean up listeners
        wsClient.off('chunk', chunkHandler)
        wsClient.off('done', doneHandler)
        wsClient.off('error', errorHandler)
      }

      // Register listeners
      wsClient.on('chunk', chunkHandler)
      wsClient.on('done', doneHandler)
      wsClient.on('error', errorHandler)
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
