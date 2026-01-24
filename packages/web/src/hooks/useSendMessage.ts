/**
 * useSendMessage Hook
 *
 * Custom hook for sending messages in a chat session.
 * Provides message sending, retry, and error handling.
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { send, sending, error, retry, canSend, resetError } = useSendMessage()
 *
 *   const handleSubmit = async (content: string) => {
 *     if (!canSend()) return
 *     await send(content)
 *   }
 *
 *   return (
 *     <div>
 *       {error() && <div>{error()}</div>}
 *       <button disabled={!canSend() || sending()} onClick={() => retry()}>
 *         {sending() ? 'Sending...' : 'Send'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */

import { createSignal, Accessor } from 'solid-js'
import { useChatContext } from '../contexts/ChatContext'

/**
 * Return type for useSendMessage hook
 */
export interface UseSendMessageReturn {
  /** Send a message */
  readonly send: (content: string) => Promise<void>
  /** Whether currently sending */
  readonly sending: Accessor<boolean>
  /** Error message if any */
  readonly error: Accessor<string | null>
  /** Retry last operation */
  readonly retry: () => Promise<void>
  /** Whether user can send message */
  readonly canSend: Accessor<boolean>
  /** Reset error state */
  readonly resetError: () => void
}

/**
 * Trim whitespace from content for validation
 */
function trimContent(content: string): string {
  return content.trim()
}

/**
 * Custom hook for sending messages
 *
 * @returns Message sending state and actions
 *
 * @throws {Error} If used outside of ChatProvider
 */
export function useSendMessage(): UseSendMessageReturn {
  const context = useChatContext()

  // Local state for sending and error
  const [sending, setSending] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  /**
   * Send a message to the current session
   */
  const send = async (content: string): Promise<void> => {
    // Validate content
    const trimmedContent = trimContent(content)
    if (!trimmedContent) {
      return
    }

    // Check if already streaming
    if (context.streaming()) {
      setError('Cannot send while streaming')
      return
    }

    // Set sending state and clear error
    setSending(true)
    setError(null)

    try {
      // Send message through context
      await context.sendMessage(trimmedContent)

      // Clear error on success
      setError(null)
    } catch (err) {
      // Set error state
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      throw err
    } finally {
      // Always clear sending state
      setSending(false)
    }
  }

  /**
   * Retry the last failed operation
   */
  const retry = async (): Promise<void> => {
    // Check if already sending
    if (sending()) {
      return
    }

    // Set sending state and clear error
    setSending(true)
    setError(null)

    try {
      // Retry through context
      await context.retry()

      // Clear error on success
      setError(null)
    } catch (err) {
      // Set error state
      const errorMessage = err instanceof Error ? err.message : 'Retry failed'
      setError(errorMessage)
      throw err
    } finally {
      // Always clear sending state
      setSending(false)
    }
  }

  /**
   * Derived state: can user send message?
   * - Session must exist
   * - Not loading
   * - Not streaming
   * - Not sending (local state)
   */
  const canSend = (): boolean => {
    return (
      context.session() !== null &&
      !context.loading() &&
      !context.streaming() &&
      !sending()
    )
  }

  /**
   * Reset error state
   */
  const resetError = (): void => {
    setError(null)
  }

  return {
    send,
    sending,
    error,
    retry,
    canSend,
    resetError,
  }
}
