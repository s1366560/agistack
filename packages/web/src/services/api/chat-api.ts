/**
 * Chat API Client
 *
 * TDD: Implementation written after tests (GREEN phase)
 * Implements chat session and message operations with SSE streaming
 */

import { apiClient } from './client';
import type { ApiClient } from './client';
import type { Session, Message, MessageChunk } from '@agistack/shared';
import {
  ApiError,
  SessionNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  StreamInterruptedError,
} from './errors';

/**
 * Chat API endpoints
 */
const ENDPOINTS = {
  SESSIONS: '/sessions',
  SESSION: (id: string) => `/sessions/${id}`,
  MESSAGES: (sessionId: string) => `/sessions/${sessionId}/messages`,
  STREAM: (sessionId: string) => `/sessions/${sessionId}/messages/stream`,
} as const;

/**
 * Chat API client for session and message operations
 *
 * Provides methods for:
 * - Retrieving sessions and messages
 * - Sending messages
 * - Streaming responses via Server-Sent Events (SSE)
 */
export class ChatApi {
  /**
   * Create a new ChatApi instance
   *
   * @param apiClient - The API client to use for requests
   */
  constructor(private apiClient: ApiClient) {}

  /**
   * Get all sessions
   *
   * @param filters - Optional filters (projectId, agentType, limit, offset)
   * @returns Array of sessions
   * @throws {NetworkError} If the API call fails
   */
  async getSessions(filters?: {
    projectId?: string;
    agentType?: 'build' | 'plan' | 'general';
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.agentType) params.append('agentType', filters.agentType);
      if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

      const url = params.toString() ? `${ENDPOINTS.SESSIONS}?${params}` : ENDPOINTS.SESSIONS;
      const response = await this.apiClient.get<{ success: boolean; data: Session[]; timestamp: string }>(url);

      return response.success && response.data ? (response.data.data ?? []) : [];
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(error.message);
      }
      throw new NetworkError('Failed to fetch sessions');
    }
  }

  /**
   * Create a new session
   *
   * @param data - Session creation data
   * @returns The created session
   * @throws {NetworkError} If the API call fails
   */
  async createSession(data: {
    projectId: string;
    agentType: 'build' | 'plan' | 'general';
    title?: string;
  }): Promise<Session> {
    try {
      const response = await this.apiClient.post<{ success: boolean; data: Session; timestamp: string }>(ENDPOINTS.SESSIONS, data);

      if (!response.success || !response.data?.data) {
        throw new Error(response.error || 'Failed to create session');
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(error.message);
      }
      throw new NetworkError('Failed to create session');
    }
  }

  /**
   * Get a session by ID
   *
   * @param id - The session ID
   * @returns The session object or null if not found
   * @throws {NetworkError} If the API call fails with a network error
   */
  async getSession(id: string): Promise<Session | null> {
    try {
      const response = await this.apiClient.get<{ success: boolean; data: Session; timestamp: string }>(ENDPOINTS.SESSION(id));

      return response.success && response.data ? response.data.data ?? null : null;
    } catch (error) {
      // Re-throw known error types
      if (error instanceof Error) {
        throw new NetworkError(error.message);
      }
      throw new NetworkError('Failed to fetch session');
    }
  }

  /**
   * Get a session with its messages
   *
   * @param id - The session ID
   * @returns Object containing session and messages, or null if not found
   * @throws {NetworkError} If the API call fails with a network error
   */
  async getSessionWithMessages(id: string): Promise<{ session: Session; messages: Message[] } | null> {
    try {
      const response = await this.apiClient.get<{ success: boolean; data: { session: Session; messages: Message[] }; timestamp: string }>(
        ENDPOINTS.SESSION(id)
      );

      // apiClient.get() 返回 { success, data }, 其中 data 是完整的响应体
      // 所以 response.data.data 才是实际的 { session, messages }
      const responseData = response.data as any;
      return response.success && responseData?.data ? responseData.data : null;
    } catch (error) {
      if (error instanceof Error) {
        throw new NetworkError(error.message);
      }
      throw new NetworkError('Failed to fetch session with messages');
    }
  }

  /**
   * Get messages for a session
   *
   * @param sessionId - The session ID
   * @returns Array of messages
   * @throws {Error} If the API call fails
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    const response = await this.apiClient.get<{ success: boolean; data: Message[]; timestamp: string }>(
      ENDPOINTS.MESSAGES(sessionId)
    );

    if (!response.success || !response.data?.data) {
      throw new Error(response.error || 'Failed to fetch messages');
    }

    return response.data.data;
  }

  /**
   * Send a message to a session
   *
   * @param sessionId - The session ID
   * @param content - The message content
   * @returns The created message
   * @throws {Error} If the API call fails or no data is returned
   */
  async sendMessage(sessionId: string, content: string): Promise<Message> {
    const response = await this.apiClient.post<{ success: boolean; data: Message; timestamp: string }>(
      ENDPOINTS.MESSAGES(sessionId),
      {
        role: 'user',
        content,
      }
    );

    if (!response.success || !response.data?.data) {
      throw new Error(response.error || 'No message data returned');
    }

    return response.data.data;
  }

  /**
   * Stream a message response via Server-Sent Events
   *
   * @deprecated Use WebSocket instead via WebSocketClient
   * This method is kept for backward compatibility only
   *
   * @param sessionId - The session ID
   * @param content - The message content to send
   * @yields {MessageChunk} Message chunks as they arrive
   * @throws {Error} Always throws - use WebSocket instead
   */
  async *streamMessage(
    sessionId: string,
    content: string
  ): AsyncGenerator<MessageChunk> {
    throw new Error(
      'SSE streaming is deprecated. Please use WebSocket for real-time AI responses.\n' +
      'Use the WebSocketClient.sendChatMessage() method instead.'
    );
  }
}

/**
 * Create a ChatApi instance with the default API client
 *
 * @returns A new ChatApi instance
 */
export function createChatApi(): ChatApi {
  return new ChatApi(apiClient);
}
