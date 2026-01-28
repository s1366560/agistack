/**
 * WebSocket Client Chat Feature Tests
 *
 * TDD Approach: Tests written for chat-specific functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient } from './websocket';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;

    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('WebSocket Client - Chat Features', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    // Create client with test configuration
    client = new WebSocketClient({
      url: 'ws://localhost:3001/ws',
      reconnectInterval: 100,
      heartbeatInterval: 10000,
      maxReconnectAttempts: 3,
    });

    // Prevent auto-connect for better test control
    (client as any).setAutoConnect(false);
    client.connect();
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('sendChatMessage', () => {
    it('sends chat message with correct format', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      const sessionId = 'session_123';
      const content = 'Hello, AI!';

      client.sendChatMessage(sessionId, content);

      const sentMessages = (client as any).ws.sentMessages;
      const lastMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

      expect(lastMessage.type).toBe('chat');
      expect(lastMessage.sessionId).toBe(sessionId);
      expect(lastMessage.content).toBe(content);
      expect(lastMessage.timestamp).toBeDefined();
    });

    it('throws error when not connected', () => {
      const disconnectedClient = new WebSocketClient({
        url: 'ws://localhost:3001/ws',
      });

      disconnectedClient.disconnect();

      expect(() => {
        disconnectedClient.sendChatMessage('session_123', 'Test');
      }).toThrow('WebSocket is not connected');

      disconnectedClient.disconnect();
    });
  });

  describe('subscribeToSession', () => {
    it('subscribes to session and tracks it locally', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      const sessionId = 'session_456';

      client.subscribeToSession(sessionId);

      // Check local tracking
      expect(client.isSubscribedToSession(sessionId)).toBe(true);

      // Check sent message
      const sentMessages = (client as any).ws.sentMessages;
      const subscribeMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

      expect(subscribeMessage.type).toBe('subscribe');
      expect(subscribeMessage.sessionId).toBe(sessionId);
    });

    it('receives subscribed confirmation', (done) => {
      const sessionId = 'session_789';

      client.on('subscribed', (data: any) => {
        expect(data.type).toBe('subscribed');
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      // Wait for connection then subscribe
      setTimeout(() => {
        client.subscribeToSession(sessionId);

        // Simulate server response
        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'subscribed',
            sessionId,
            timestamp: new Date().toISOString(),
          }));
        }, 20);
      }, 20);
    });
  });

  describe('unsubscribeFromSession', () => {
    it('unsubscribes from session and removes from local tracking', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      const sessionId = 'session_999';

      // First subscribe
      client.subscribeToSession(sessionId);
      expect(client.isSubscribedToSession(sessionId)).toBe(true);

      // Then unsubscribe
      client.unsubscribeFromSession(sessionId);
      expect(client.isSubscribedToSession(sessionId)).toBe(false);

      // Check sent message
      const sentMessages = (client as any).ws.sentMessages;
      const unsubscribeMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

      expect(unsubscribeMessage.type).toBe('unsubscribe');
      expect(unsubscribeMessage.sessionId).toBe(sessionId);
    });

    it('receives unsubscribed confirmation', (done) => {
      const sessionId = 'session_unsub_123';

      client.on('unsubscribed', (data: any) => {
        expect(data.type).toBe('unsubscribed');
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      // Wait for connection then subscribe and unsubscribe
      setTimeout(() => {
        client.subscribeToSession(sessionId);

        setTimeout(() => {
          client.unsubscribeFromSession(sessionId);

          // Simulate server response
          setTimeout(() => {
            (client as any).ws.simulateMessage(JSON.stringify({
              type: 'unsubscribed',
              sessionId,
              timestamp: new Date().toISOString(),
            }));
          }, 20);
        }, 20);
      }, 20);
    });
  });

  describe('Message Reception', () => {
    it('receives and emits chunk messages', (done) => {
      const sessionId = 'session_chunk_123';
      const content = 'Partial response';

      client.on('chunk', (data: any) => {
        expect(data.type).toBe('chunk');
        expect(data.content).toBe(content);
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      // Wait for connection
      setTimeout(() => {
        client.subscribeToSession(sessionId);

        // Simulate server sending chunk
        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'chunk',
            sessionId,
            content,
            done: false,
            timestamp: new Date().toISOString(),
          }));
        }, 20);
      }, 20);
    });

    it('receives and emits done messages', (done) => {
      const sessionId = 'session_done_123';

      client.on('done', (data: any) => {
        expect(data.type).toBe('done');
        expect(data.sessionId).toBe(sessionId);
        done();
      });

      // Wait for connection
      setTimeout(() => {
        client.subscribeToSession(sessionId);

        // Simulate server sending done
        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'done',
            sessionId,
            timestamp: new Date().toISOString(),
          }));
        }, 20);
      }, 20);
    });

    it('receives and emits error messages', (done) => {
      client.on('error', (data: any) => {
        expect(data.type).toBe('error');
        expect(data.code).toBeDefined();
        expect(data.message).toBeDefined();
        done();
      });

      // Wait for connection
      setTimeout(() => {
        // Simulate server sending error
        (client as any).ws.simulateMessage(JSON.stringify({
          type: 'error',
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          timestamp: new Date().toISOString(),
        }));
      }, 20);
    });
  });

  describe('isSubscribedToSession', () => {
    it('returns false for non-subscribed session', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      expect(client.isSubscribedToSession('non_existent_session')).toBe(false);
    });

    it('returns true for subscribed session', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      const sessionId = 'session_check_123';
      client.subscribeToSession(sessionId);

      expect(client.isSubscribedToSession(sessionId)).toBe(true);
    });

    it('returns false after unsubscribing', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      const sessionId = 'session_check_unsub_123';
      client.subscribeToSession(sessionId);
      expect(client.isSubscribedToSession(sessionId)).toBe(true);

      client.unsubscribeFromSession(sessionId);
      expect(client.isSubscribedToSession(sessionId)).toBe(false);
    });
  });

  describe('Complete Chat Flow', () => {
    it('handles complete chat message flow', async () => {
      await new Promise<void>((resolve) => {
        client.on('connected', resolve);
      });

      const sessionId = 'session_flow_123';
      const userMessage = 'Tell me a joke';

      // Subscribe to session
      client.subscribeToSession(sessionId);

      // Wait for subscribed confirmation
      await new Promise<void>((resolve) => {
        const handler = (data: any) => {
          if (data.type === 'subscribed') {
            client.off('subscribed', handler);
            resolve();
          }
        };
        client.on('subscribed', handler);

        // Simulate server response
        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'subscribed',
            sessionId,
            timestamp: new Date().toISOString(),
          }));
        }, 10);
      });

      // Send chat message
      client.sendChatMessage(sessionId, userMessage);

      const sentMessages = (client as any).ws.sentMessages;
      const chatMessage = JSON.parse(sentMessages[sentMessages.length - 1]);
      expect(chatMessage.type).toBe('chat');
      expect(chatMessage.content).toBe(userMessage);

      // Receive chunk response
      await new Promise<void>((resolve) => {
        const handler = (data: any) => {
          if (data.type === 'chunk') {
            client.off('chunk', handler);
            expect(data.sessionId).toBe(sessionId);
            expect(data.content).toContain('AI response to:');
            resolve();
          }
        };
        client.on('chunk', handler);

        // Simulate server sending chunk
        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'chunk',
            sessionId,
            content: `AI response to: ${userMessage}`,
            done: true,
            timestamp: new Date().toISOString(),
          }));
        }, 10);
      });

      // Receive done message
      await new Promise<void>((resolve) => {
        const handler = (data: any) => {
          if (data.type === 'done') {
            client.off('done', handler);
            expect(data.sessionId).toBe(sessionId);
            resolve();
          }
        };
        client.on('done', handler);

        // Simulate server sending done
        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'done',
            sessionId,
            timestamp: new Date().toISOString(),
          }));
        }, 10);
      });
    });
  });
});
