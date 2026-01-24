/**
 * ChatContext Types
 *
 * Type definitions for the chat context provider
 * Manages chat sessions, messages, and streaming state
 */

import type { Accessor, JSX } from 'solid-js'
import type { Session, Message, MessageChunk } from '@agistack/shared'
import type { ChatApi } from '../services/api/chat-api'

/**
 * Chat context state interface (using SolidJS Accessor/signals)
 */
export interface ChatState {
  /** Current session object */
  session: Accessor<Session | null>
  /** Messages in the current session */
  messages: Accessor<Message[]>
  /** Loading state for operations */
  loading: Accessor<boolean>
  /** Error message if an operation failed */
  error: Accessor<string | null>
  /** Whether a stream is currently active */
  streaming: Accessor<boolean>
  /** Current streaming text content */
  streamText: Accessor<string>
}

/**
 * Chat context actions interface
 */
export interface ChatActions {
  /** Load a session by ID */
  loadSession: (id: string) => Promise<void>
  /** Send a message to the current session */
  sendMessage: (content: string) => Promise<void>
  /** Retry the last failed operation */
  retry: () => Promise<void>
}

/**
 * Combined chat context value interface
 */
export interface ChatContextValue extends ChatState, ChatActions {}

/**
 * Chat context provider props
 */
export interface ChatProviderProps {
  /** Chat API instance */
  api: ChatApi
  /** Child components */
  children: JSX.Element
}

/**
 * Internal state tracking for retry functionality
 */
export interface ChatInternalState {
  /** Last attempted session ID for retry */
  lastSessionId: string | null
  /** Last attempted message content for retry */
  lastMessageContent: string | null
  /** Last operation type for retry */
  lastOperation: 'loadSession' | 'sendMessage' | null
}
