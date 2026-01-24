/**
 * Chat API Client
 *
 * TDD: Implementation written after tests (GREEN phase)
 * Implements chat session and message operations with SSE streaming
 */

import { apiClient } from './client';
import type { ApiClient } from './client';
import type { Session, Message, MessageChunk } from '@agistack/shared';

/**
 * Chat API endpoints
 */
const ENDPOINTS = {
  SESSION: (id: string) => `/api/sessions/${id}`,
  MESSAGES: (sessionId: string) => `/api/sessions/${sessionId}/messages`,
  STREAM: (sessionId: string) => `/api/sessions/${sessionId}/messages/stream`,
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
   * Get a session by ID
   *
   * @param id - The session ID
   * @returns The session object or null if not found
   * @throws {Error} If the API call fails with a network error
   */
  async getSession(id: string): Promise<Session | null> {
    const response = await this.apiClient.get<Session>(ENDPOINTS.SESSION(id));

    return response.success ? response.data ?? null : null;
  }

  /**
   * Get messages for a session
   *
   * @param sessionId - The session ID
   * @returns Array of messages
   * @throws {Error} If the API call fails
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    const response = await this.apiClient.get<Message[]>(
      ENDPOINTS.MESSAGES(sessionId)
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch messages');
    }

    return response.data ?? [];
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
    const response = await this.apiClient.post<Message>(
      ENDPOINTS.MESSAGES(sessionId),
      {
        role: 'user',
        content,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'No message data returned');
    }

    return response.data;
  }

  /**
   * Stream a message response via Server-Sent Events
   *
   * @param sessionId - The session ID
   * @param content - The message content to send
   * @yields {MessageChunk} Message chunks as they arrive
   * @throws {Error} If the stream fails to initialize
   */
  async *streamMessage(
    sessionId: string,
    content: string
  ): AsyncGenerator<MessageChunk> {
    const response = await fetch(ENDPOINTS.STREAM(sessionId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'user',
        content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.status}`);
    }

    const body = response.body;
    if (!body) {
      throw new Error('No response body');
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              const chunk = JSON.parse(jsonStr) as MessageChunk;
              yield chunk;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
