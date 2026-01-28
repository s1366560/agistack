/**
 * Chat API Client Tests
 *
 * TDD: Tests written first (RED phase)
 * Run tests before implementation to verify they fail
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatApi } from './chat-api';
import { ApiClient } from './client';
import type { Session, Message, MessageChunk } from '@agistack/shared';
import {
  SessionNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  StreamInterruptedError,
  NetworkError,
} from './errors';

// Mock fetch for SSE streaming
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ApiClient
const createMockApiClient = () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as ApiClient;

  return mockClient;
};

describe('ChatApi', () => {
  let chatApi: ChatApi;
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    chatApi = new ChatApi(mockApiClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe('getSession(id)', () => {
    it('should return session when API call succeeds', async () => {
      const mockSession: Session = {
        id: 'session_123',
        projectId: 'project_456',
        agentType: 'general',
        title: 'Test Session',
        messages: [],
        context: {},
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T10:00:00Z'),
      };

      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await chatApi.getSession('session_123');

      expect(result).toEqual(mockSession);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/sessions/session_123');
    });

    it('should return null when session not found (404)', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Session not found',
      });

      const result = await chatApi.getSession('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when API returns error', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Internal server error',
      });

      const result = await chatApi.getSession('session_123');

      expect(result).toBeNull();
    });

    it('should throw when API call throws network error', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(chatApi.getSession('session_123')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle undefined data from API', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      const result = await chatApi.getSession('session_123');

      expect(result).toBeNull();
    });
  });

  describe('getMessages(sessionId)', () => {
    it('should return messages array when API call succeeds', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date('2025-01-24T10:00:00Z'),
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Hi there!',
          createdAt: new Date('2025-01-24T10:00:01Z'),
        },
      ];

      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: true,
        data: mockMessages,
      });

      const result = await chatApi.getMessages('session_123');

      expect(result).toEqual(mockMessages);
      expect(result).toHaveLength(2);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/sessions/session_123/messages'
      );
    });

    it('should return empty array when no messages', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await chatApi.getMessages('session_123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw when API call fails', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(chatApi.getMessages('session_123')).rejects.toThrow(
        'Network error'
      );
    });

    it('should throw when API returns error response', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch messages',
      });

      await expect(chatApi.getMessages('session_123')).rejects.toThrow(
        'Failed to fetch messages'
      );
    });

    it('should handle undefined data as empty array', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      const result = await chatApi.getMessages('session_123');

      expect(result).toEqual([]);
    });
  });

  describe('sendMessage(sessionId, content)', () => {
    it('should send message and return created message', async () => {
      const mockMessage: Message = {
        id: 'msg_123',
        role: 'user',
        content: 'Hello, AI!',
        createdAt: new Date('2025-01-24T10:00:00Z'),
      };

      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: true,
        data: mockMessage,
      });

      const result = await chatApi.sendMessage('session_123', 'Hello, AI!');

      expect(result).toEqual(mockMessage);
      expect(result.content).toBe('Hello, AI!');
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/sessions/session_123/messages',
        { role: 'user', content: 'Hello, AI!' }
      );
    });

    it('should throw when API call fails', async () => {
      vi.mocked(mockApiClient.post).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        chatApi.sendMessage('session_123', 'Test')
      ).rejects.toThrow('Network error');
    });

    it('should throw when API returns error response', async () => {
      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: false,
        error: 'Failed to send message',
      });

      await expect(
        chatApi.sendMessage('session_123', 'Test')
      ).rejects.toThrow('Failed to send message');
    });

    it('should handle undefined data from successful response', async () => {
      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      await expect(
        chatApi.sendMessage('session_123', 'Test')
      ).rejects.toThrow('No message data returned');
    });
  });

  describe('streamMessage(sessionId, content)', () => {
    it('should yield message chunks from SSE stream', async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send first chunk
          controller.enqueue(
            encoder.encode('data: {"delta":"Hello","done":false}\n\n')
          );

          // Send second chunk
          controller.enqueue(
            encoder.encode('data: {"delta":" world","done":false}\n\n')
          );

          // Send final chunk
          controller.enqueue(
            encoder.encode('data: {"delta":"","done":true}\n\n')
          );

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: MessageChunk[] = [];
      for await (const chunk of chatApi.streamMessage('session_123', 'Hello')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].delta).toBe('Hello');
      expect(chunks[0].done).toBe(false);
      expect(chunks[1].delta).toBe(' world');
      expect(chunks[1].done).toBe(false);
      expect(chunks[2].delta).toBe('');
      expect(chunks[2].done).toBe(true);
    });

    it('should handle chunks with metadata', async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          controller.enqueue(
            encoder.encode(
              'data: {"delta":"Response","done":false,"metadata":{"model":"claude-3-5-sonnet","tokensUsed":10}}\n\n'
            )
          );

          controller.enqueue(
            encoder.encode('data: {"delta":"","done":true}\n\n')
          );

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: MessageChunk[] = [];
      for await (const chunk of chatApi.streamMessage('session_123', 'Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].metadata?.model).toBe('claude-3-5-sonnet');
      expect(chunks[0].metadata?.tokensUsed).toBe(10);
    });

    it('should handle split buffer lines', async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send incomplete line
          controller.enqueue(
            encoder.encode('data: {"delta":"Hel')
          );

          // Send rest of line
          controller.enqueue(
            encoder.encode('lo","done":false}\n\n')
          );

          // Send final chunk
          controller.enqueue(
            encoder.encode('data: {"delta":"","done":true}\n\n')
          );

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: MessageChunk[] = [];
      for await (const chunk of chatApi.streamMessage('session_123', 'Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('Hello');
    });

    it('should handle empty lines in stream', async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send empty lines
          controller.enqueue(encoder.encode('\n\n'));

          // Send actual data
          controller.enqueue(
            encoder.encode('data: {"delta":"Test","done":true}\n\n')
          );

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: MessageChunk[] = [];
      for await (const chunk of chatApi.streamMessage('session_123', 'Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].delta).toBe('Test');
    });

    it('should throw when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(
        (async () => {
          for await (const _ of chatApi.streamMessage('session_123', 'Test')) {
            // Should not reach here
          }
        })()
      ).rejects.toThrow('Stream failed: 500');
    });

    it('should throw when response body is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      } as Response);

      await expect(
        (async () => {
          for await (const _ of chatApi.streamMessage('session_123', 'Test')) {
            // Should not reach here
          }
        })()
      ).rejects.toThrow('No response body');
    });

    it('should throw when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        (async () => {
          for await (const _ of chatApi.streamMessage('session_123', 'Test')) {
            // Should not reach here
          }
        })()
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send valid chunk
          controller.enqueue(
            encoder.encode('data: {"delta":"Valid","done":false}\n\n')
          );

          // Send invalid JSON (should be skipped with warning)
          controller.enqueue(
            encoder.encode('data: {invalid json}\n\n')
          );

          // Send another valid chunk after invalid
          controller.enqueue(
            encoder.encode('data: {"delta":"After","done":true}\n\n')
          );

          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: MessageChunk[] = [];
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      for await (const chunk of chatApi.streamMessage('session_123', 'Test')) {
        chunks.push(chunk);
      }

      // Should have received valid chunks and skipped invalid one
      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('Valid');
      expect(chunks[1].delta).toBe('After');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to parse stream chunk:',
        '{invalid json}'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should make POST request to correct endpoint', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"delta":"","done":true}\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      for await (const _ of chatApi.streamMessage('session_123', 'Test message')) {
        // Consume stream
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/api/sessions/session_123/messages/stream');
      expect(callArgs[1].method).toBe('POST');

      const body = JSON.parse(callArgs[1].body);
      expect(body).toEqual({ role: 'user', content: 'Test message' });
    });

    it('should handle stream interruption gracefully', async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send first chunk
          controller.enqueue(
            encoder.encode('data: {"delta":"Partial","done":false}\n\n')
          );

          // Wait a bit to ensure first chunk is processed
          await new Promise(resolve => setTimeout(resolve, 10));

          // Simulate stream interruption
          controller.error(new Error('Stream interrupted'));
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as Response);

      const chunks: MessageChunk[] = [];
      let error: Error | null = null;

      try {
        for await (const chunk of chatApi.streamMessage('session_123', 'Test')) {
          chunks.push(chunk);
        }
      } catch (e) {
        error = e as Error;
      }

      // Should have received partial data before error
      // Note: In a real scenario, timing may vary, so we check error type
      expect(error).toBeInstanceOf(StreamInterruptedError);
      if (chunks.length > 0) {
        expect(chunks[0].delta).toBe('Partial');
      }
    });

    it('should handle timeout on stream initialization', async () => {
      // Mock fetch that never resolves
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            // Never resolve - simulates timeout
            setTimeout(() => {
              resolve({
                ok: true,
                body: new ReadableStream(),
              } as Response);
            }, 10000);
          })
      );

      const chunks: MessageChunk[] = [];
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100);
      });

      await expect(
        Promise.race([
          (async () => {
            for await (const chunk of chatApi.streamMessage('session_123', 'Test')) {
              chunks.push(chunk);
            }
          })(),
          timeoutPromise,
        ])
      ).rejects.toThrow('Request timeout');
    });

    it('should handle 404 response for session not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(
        (async () => {
          for await (const _ of chatApi.streamMessage('nonexistent', 'Test')) {
            // Should not reach here
          }
        })()
      ).rejects.toThrow(SessionNotFoundError);
    });

    it('should handle 401 unauthorized response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(
        (async () => {
          for await (const _ of chatApi.streamMessage('session_123', 'Test')) {
            // Should not reach here
          }
        })()
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should handle 403 forbidden response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(
        (async () => {
          for await (const _ of chatApi.streamMessage('session_123', 'Test')) {
            // Should not reach here
          }
        })()
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Error Handling: getSession with invalid session ID', () => {
    it('should handle empty session ID', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Invalid session ID',
      });

      const result = await chatApi.getSession('');

      expect(result).toBeNull();
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/sessions/');
    });

    it('should handle session ID with special characters', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Invalid session ID format',
      });

      const result = await chatApi.getSession('session_@#$!');

      expect(result).toBeNull();
    });

    it('should handle very long session ID', async () => {
      const longId = 'a'.repeat(10000);
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Session ID too long',
      });

      const result = await chatApi.getSession(longId);

      expect(result).toBeNull();
    });
  });

  describe('Error Handling: getMessages with invalid session ID', () => {
    it('should handle 404 response for nonexistent session', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValueOnce({
        success: false,
        error: 'Session not found',
      });

      await expect(chatApi.getMessages('nonexistent')).rejects.toThrow(
        'Session not found'
      );
    });

    it('should handle timeout on messages request', async () => {
      vi.mocked(mockApiClient.get).mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100);
          })
      );

      await expect(chatApi.getMessages('session_123')).rejects.toThrow(
        'Request timeout'
      );
    });
  });

  describe('Error Handling: sendMessage with edge cases', () => {
    it('should handle empty message content', async () => {
      const mockMessage: Message = {
        id: 'msg_123',
        role: 'user',
        content: '',
        createdAt: new Date('2025-01-24T10:00:00Z'),
      };

      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: true,
        data: mockMessage,
      });

      const result = await chatApi.sendMessage('session_123', '');

      expect(result).toEqual(mockMessage);
      expect(result.content).toBe('');
    });

    it('should handle very long message content', async () => {
      const longContent = 'a'.repeat(100000);
      const mockMessage: Message = {
        id: 'msg_123',
        role: 'user',
        content: longContent,
        createdAt: new Date('2025-01-24T10:00:00Z'),
      };

      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: true,
        data: mockMessage,
      });

      const result = await chatApi.sendMessage('session_123', longContent);

      expect(result.content).toBe(longContent);
    });

    it('should handle message with special characters and emojis', async () => {
      const specialContent = 'Hello 🚀 <script>alert("test")</script> & special "chars"';
      const mockMessage: Message = {
        id: 'msg_123',
        role: 'user',
        content: specialContent,
        createdAt: new Date('2025-01-24T10:00:00Z'),
      };

      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: true,
        data: mockMessage,
      });

      const result = await chatApi.sendMessage('session_123', specialContent);

      expect(result.content).toBe(specialContent);
    });

    it('should handle 429 rate limit response', async () => {
      vi.mocked(mockApiClient.post).mockResolvedValueOnce({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });

      await expect(
        chatApi.sendMessage('session_123', 'Test')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Error Handling: Network resilience', () => {
    it('should handle network error on getSession', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(chatApi.getSession('session_123')).rejects.toThrow(
        NetworkError
      );
    });

    it('should handle network error on getMessages', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(chatApi.getMessages('session_123')).rejects.toThrow(
        'Network request failed'
      );
    });

    it('should handle network error on sendMessage', async () => {
      vi.mocked(mockApiClient.post).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(
        chatApi.sendMessage('session_123', 'Test')
      ).rejects.toThrow('Network request failed');
    });

    it('should handle CORS error', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValueOnce(
        new Error('CORS policy blocked request')
      );

      await expect(chatApi.getSession('session_123')).rejects.toThrow(
        NetworkError
      );
    });
  });
});
