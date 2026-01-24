/**
 * useChatSession Hook
 *
 * Custom hook that wraps ChatContext to provide chat functionality.
 * Handles session loading, message sending, and 404 error navigation.
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { session, messages, loading, sendMessage } = useChatSession('session-123')
 *
 *   if (loading()) return <div>Loading...</div>
 *
 *   return (
 *     <div>
 *       <h1>{session()?.title}</h1>
 *       <MessageList messages={messages()} />
 *       <MessageInput onSend={sendMessage} />
 *     </div>
 *   )
 * }
 * ```
 */

import { useNavigate } from '@solidjs/router'
import { useChatContext } from '../contexts/ChatContext'
import type { Accessor } from 'solid-js'
import type { Session, Message } from '@agistack/shared'
import type { ChatContextValue } from '../contexts/ChatContext.types'

/**
 * Return type for useChatSession hook
 */
export interface UseChatSessionReturn {
  /** Current session object */
  readonly session: Accessor<Session | null>
  /** Messages in the current session */
  readonly messages: Accessor<Message[]>
  /** Loading state */
  readonly loading: Accessor<boolean>
  /** Error message if any */
  readonly error: Accessor<string | null>
  /** Whether streaming response */
  readonly streaming: Accessor<boolean>
  /** Current streaming text */
  readonly streamText: Accessor<string>
  /** Load a session by ID */
  readonly loadSession: (id: string) => Promise<void>
  /** Send a message */
  readonly sendMessage: (content: string) => Promise<void>
  /** Retry last operation */
  readonly retry: () => Promise<void>
  /** Current session ID (from parameter) */
  readonly sessionId: Accessor<string | undefined>
  /** Whether user can send message */
  readonly canSendMessage: Accessor<boolean>
}

/**
 * Check if error is a 404 error
 */
function is404Error(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('404')
  }
  return false
}

/**
 * Custom hook for chat session management
 *
 * @param sessionId - Optional session ID to track
 * @returns Chat session state and actions
 *
 * @throws {Error} If used outside of ChatProvider
 */
export function useChatSession(sessionId?: string): UseChatSessionReturn {
  const context = useChatContext()
  const navigate = useNavigate()

  /**
   * Wrapper around context.loadSession that handles 404 navigation
   */
  const loadSession = async (id: string): Promise<void> => {
    try {
      await context.loadSession(id)
    } catch (error) {
      // Navigate to sessions list on 404
      if (is404Error(error)) {
        navigate('/sessions', { replace: true })
      }
      // Re-throw error for error boundary or component handling
      throw error
    }
  }

  /**
   * Derived state: can user send message?
   * - Session must exist
   * - Not loading
   * - Not streaming
   */
  const canSendMessage = (): boolean => {
    return (
      context.session() !== null &&
      !context.loading() &&
      !context.streaming()
    )
  }

  return {
    // State from context
    session: context.session,
    messages: context.messages,
    loading: context.loading,
    error: context.error,
    streaming: context.streaming,
    streamText: context.streamText,

    // Actions
    loadSession,
    sendMessage: context.sendMessage,
    retry: context.retry,

    // Additional values
    sessionId: () => sessionId,
    canSendMessage,
  }
}
