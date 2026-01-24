/**
 * WebSocket Client Tests
 *
 * TDD Approach: Tests written first, implementation will follow
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

  // Helper to simulate connection error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('WebSocket Client', () => {
  let client: WebSocketClient;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Create client with test configuration
    client = new WebSocketClient({
      url: 'ws://localhost:3001/ws',
      reconnectInterval: 100,
      heartbeatInterval: 10000, // Longer interval to avoid interference in tests
      maxReconnectAttempts: 3, // Limit reconnection attempts
    });

    // Prevent auto-connect for better test control
    (client as any).setAutoConnect(false);
    client.connect();

    // Get the WebSocket instance
    mockWebSocket = (client as any).ws;
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('connects to WebSocket server', () => {
      expect((client as any).ws).toBeDefined();
      expect((client as any).ws.url).toBe('ws://localhost:3001/ws');
    });

    it('emits connected event when connection established', (done) => {
      client.on('connected', () => {
        expect(client.isConnected()).toBe(true);
        done();
      });
    });

    it('handles connection errors gracefully', async () => {
      const errorClient = new WebSocketClient({
        url: 'ws://invalid-host:9999/ws',
        reconnectInterval: 100,
        maxReconnectAttempts: 1, // Limit reconnection attempts
        heartbeatInterval: 30000, // Disable heartbeat for this test
      });

      const errorHandler = vi.fn();
      errorClient.on('error', errorHandler);

      // Simulate error immediately
      (errorClient as any).ws.simulateError();

      // Wait a bit for error to be handled
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(errorHandler).toHaveBeenCalled();
      errorClient.disconnect();
    });

    it('disconnects from server', () => {
      client.disconnect();

      expect(client.isConnected()).toBe(false);
      // After disconnect, ws is set to null
      expect((client as any).ws).toBeNull();
    });

    it('emits disconnected event when connection closed', async () => {
      await new Promise<void>((resolve) => {
        client.on('disconnected', () => {
          expect(client.isConnected()).toBe(false);
          resolve();
        });

        client.disconnect();
      });
    });
  });

  describe('Authentication', () => {
    it('sends authentication token on connection', (done) => {
      client.connect('test-token-123');

      setTimeout(() => {
        const sentMessages = (client as any).ws.sentMessages;
        const authMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

        expect(authMessage.type).toBe('hello');
        expect(authMessage.token).toBe('test-token-123');
        done();
      }, 20);
    });

    it('receives authentication confirmation', (done) => {
      client.on('authenticated', (data) => {
        expect(data.userId).toBeDefined();
        done();
      });

      client.connect('valid-token');

      // Simulate server response
      setTimeout(() => {
        (client as any).ws.simulateMessage(JSON.stringify({
          type: 'authenticated',
          userId: 'user-123',
        }));
      }, 20);
    });

    it('handles authentication failure', (done) => {
      client.on('error', (error) => {
        expect(error.message).toContain('authentication');
        done();
      });

      client.connect('invalid-token');

      // Simulate server closing connection
      setTimeout(() => {
        (client as any).ws.close(1008, 'Invalid token');
      }, 20);
    });
  });

  describe('Channel Subscription', () => {
    it('subscribes to a channel', (done) => {
      client.on('connected', () => {
        client.subscribe('session:test-123');

        setTimeout(() => {
          const sentMessages = (client as any).ws.sentMessages;
          const subMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

          expect(subMessage.type).toBe('sub');
          expect(subMessage.channel).toBe('session:test-123');
          done();
        }, 10);
      });
    });

    it('unsubscribes from a channel', (done) => {
      client.on('connected', () => {
        client.subscribe('session:test-123');

        setTimeout(() => {
          client.unsubscribe('session:test-123');

          setTimeout(() => {
            const sentMessages = (client as any).ws.sentMessages;
            const unsubMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

            expect(unsubMessage.type).toBe('unsub');
            expect(unsubMessage.channel).toBe('session:test-123');
            done();
          }, 10);
        }, 10);
      });
    });

    it('tracks active subscriptions', (done) => {
      client.on('connected', () => {
        client.subscribe('session:test-1');
        client.subscribe('session:test-2');

        const subscriptions = client.getSubscriptions();
        expect(subscriptions).toContain('session:test-1');
        expect(subscriptions).toContain('session:test-2');
        expect(subscriptions.length).toBe(2);
        done();
      });
    });
  });

  describe('Message Handling', () => {
    it('receives and parses messages', (done) => {
      client.on('message', (data) => {
        expect(data.type).toBe('test');
        expect(data.payload).toBe('hello');
        done();
      });

      client.connect('test-token');

      setTimeout(() => {
        (client as any).ws.simulateMessage(JSON.stringify({
          type: 'test',
          payload: 'hello'
        }));
      }, 20);
    });

    it('responds to ping messages', (done) => {
      client.connect('test-token');

      setTimeout(() => {
        (client as any).ws.simulateMessage(JSON.stringify({ type: 'ping' }));

        setTimeout(() => {
          const sentMessages = (client as any).ws.sentMessages;
          const pongMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

          expect(pongMessage.type).toBe('pong');
          done();
        }, 10);
      }, 20);
    });

    it('handles malformed JSON gracefully', (done) => {
      client.connect('test-token');

      setTimeout(() => {
        // Should not crash
        expect(() => {
          (client as any).ws.simulateMessage('invalid json');
        }).not.toThrow();

        done();
      }, 20);
    });
  });

  describe('Streaming Support', () => {
    it('receives streaming text chunks', (done) => {
      const chunks: string[] = [];

      client.on('chunk', (data) => {
        chunks.push(data.content);

        if (data.done) {
          expect(chunks.join('')).toBe('Hello World!');
          done();
        }
      });

      // Wait for connection
      setTimeout(() => {
        client.subscribe('session:test');

        setTimeout(() => {
          const chunkMessages = [
            { type: 'chunk', content: 'Hello', done: false },
            { type: 'chunk', content: ' ', done: false },
            { type: 'chunk', content: 'World', done: false },
            { type: 'chunk', content: '!', done: true },
          ];

          chunkMessages.forEach((msg, i) => {
            setTimeout(() => {
              (client as any).ws.simulateMessage(JSON.stringify(msg));
            }, i * 10);
          });
        }, 20);
      }, 20);
    });

    it('receives tool call events', (done) => {
      client.on('tool_call', (data) => {
        expect(data.toolCall).toBeDefined();
        expect(data.toolCall.name).toBe('read-file');
        expect(data.toolCall.arguments.path).toBe('/test.txt');
        done();
      });

      // Wait for connection then subscribe
      setTimeout(() => {
        client.subscribe('session:test');

        setTimeout(() => {
          (client as any).ws.simulateMessage(JSON.stringify({
            type: 'tool_call',
            toolCall: {
              id: 'tool-123',
              name: 'read-file',
              arguments: { path: '/test.txt' }
            }
          }));
        }, 20);
      }, 20);
    });
  });

  describe('Reconnection', () => {
    it('automatically reconnects on connection loss', (done) => {
      let reconnectCount = 0;

      client.on('reconnecting', (attempt) => {
        reconnectCount = attempt;
      });

      client.on('connected', () => {
        if (reconnectCount > 0) {
          expect(reconnectCount).toBeGreaterThan(0);
          done();
        }
      });

      // Simulate connection loss
      setTimeout(() => {
        (client as any).ws.close();
      }, 50);
    });

    it('respects maximum reconnection attempts', (done) => {
      const limitedClient = new WebSocketClient({
        url: 'ws://localhost:3001/ws',
        reconnectInterval: 10,
        maxReconnectAttempts: 3,
      });

      let reconnectCount = 0;

      limitedClient.on('reconnecting', (attempt) => {
        reconnectCount = attempt;
      });

      limitedClient.on('error', () => {
        expect(reconnectCount).toBe(3);
        limitedClient.disconnect();
        done();
      });

      // Simulate connection loss
      setTimeout(() => {
        (limitedClient as any).ws.close();
      }, 50);
    });
  });

  describe('Heartbeat', () => {
    it('sends pong in response to ping', (done) => {
      client.connect('test-token');

      setTimeout(() => {
        (client as any).ws.simulateMessage(JSON.stringify({ type: 'ping' }));

        setTimeout(() => {
          const sentMessages = (client as any).ws.sentMessages;
          const pongMessage = JSON.parse(sentMessages[sentMessages.length - 1]);

          expect(pongMessage.type).toBe('pong');
          done();
        }, 10);
      }, 20);
    });

    it('detects stale connection', (done) => {
      client.connect('test-token');

      // Set heartbeat timeout
      setTimeout(() => {
        // Simulate no heartbeat for 2.5x interval (10000 * 2.5 = 25000ms)
        (client as any).lastHeartbeat = Date.now() - 26000;

        setTimeout(() => {
          // Should trigger reconnection
          expect((client as any).reconnecting).toBe(true);
          client.disconnect();
          done();
        }, 150);
      }, 20);
    });
  });

  describe('Event Cleanup', () => {
    it('removes event listeners', () => {
      const handler = () => {};

      client.on('message', handler);

      // Check that listener was added using our tracking method
      const listeners = (client as any).getListeners('message');
      expect(listeners.length).toBe(1);

      client.off('message', handler);

      // Check that listener was removed
      const listenersAfter = (client as any).getListeners('message');
      expect(listenersAfter.length).toBe(0);
    });

    it('clears all event listeners on disconnect', async () => {
      client.on('message', () => {});
      client.on('connected', () => {});
      client.on('disconnected', () => {});

      await new Promise<void>((resolve) => {
        client.on('disconnected', () => {
          // Wait a bit for cleanup to complete
          setTimeout(() => {
            // Check that listeners were cleared using our tracking method
            const messageListeners = (client as any).getListeners('message');
            const connectedListeners = (client as any).getListeners('connected');
            const disconnectedListeners = (client as any).getListeners('disconnected');

            expect(messageListeners.length).toBe(0);
            expect(connectedListeners.length).toBe(0);
            expect(disconnectedListeners.length).toBe(0);
            resolve();
          }, 50);
        });

        client.disconnect();
      });
    });
  });

  describe('State Management', () => {
    it('tracks connection state', (done) => {
      expect(client.isConnected()).toBe(false);

      client.on('connected', () => {
        expect(client.isConnected()).toBe(true);
        client.disconnect();
        expect(client.isConnected()).toBe(false);
        done();
      });
    });

    it('provides connection status', (done) => {
      client.on('connected', () => {
        const status = client.getStatus();

        expect(status).toHaveProperty('connected');
        expect(status).toHaveProperty('authenticated');
        expect(status).toHaveProperty('subscriptions');
        expect(status.connected).toBe(true);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('emits error event on WebSocket error', async () => {
      await new Promise<void>((resolve) => {
        client.on('error', (error) => {
          expect(error).toBeDefined();
          resolve();
        });

        (client as any).ws.simulateError();
      });
    });

    it('handles message send errors', async () => {
      await new Promise<void>((resolve) => {
        client.on('error', (error) => {
          // Error is expected when disconnecting
          resolve();
        });

        client.disconnect();

        // Try to send when disconnected - should throw
        try {
          client.subscribe('session:test');
        } catch (error) {
          expect(error).toBeDefined();
          resolve();
        }
      });
    });
  });
});
