/**
 * WebSocket Server Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketServer } from './server';
import { createServer } from 'http';
import { WebSocket } from 'ws';

describe('WebSocket Server', () => {
  let wsServer: WebSocketServer;
  let httpServer: any;
  let wsClient: WebSocket;
  const PORT = 3001;

  beforeEach(() => {
    // Create HTTP server for WebSocket
    httpServer = createServer();

    // Initialize WebSocket server
    wsServer = new WebSocketServer({
      server: httpServer,
      path: '/ws'
    });

    // Start server
    httpServer.listen(PORT);
  });

  afterEach(() => {
    // Close client connection
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }

    // Close WebSocket server
    wsServer.close();

    // Close HTTP server
    httpServer.close();
  });

  describe('Connection Management', () => {
    it('accepts new WebSocket connections', (done) => {
      wsServer.on('connection', (ws) => {
        expect(ws).toBeDefined();
        done();
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);
    });

    it('assigns unique ID to each client', (done) => {
      wsServer.on('connection', (ws: any) => {
        expect(ws.id).toBeDefined();
        expect(typeof ws.id).toBe('string');
        done();
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);
    });

    it('tracks connected clients', (done) => {
      const clientId: string[] = [];

      wsServer.on('connection', (ws: any) => {
        clientId.push(ws.id);

        if (clientId.length === 2) {
          expect(wsServer.getClientCount()).toBe(2);
          done();
        }
      });

      // Create two connections
      const client1 = new WebSocket(`ws://localhost:${PORT}/ws`);
      const client2 = new WebSocket(`ws://localhost:${PORT}/ws`);
    });

    it('removes disconnected clients', (done) => {
      let clientCount = 0;

      wsServer.on('connection', (ws: any) => {
        clientCount++;
        if (clientCount === 1) {
          expect(wsServer.getClientCount()).toBe(1);

          ws.on('close', () => {
            expect(wsServer.getClientCount()).toBe(0);
            done();
          });
        }
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.close();
      });
    });
  });

  describe('Authentication', () => {
    it('requires authentication token on connection', (done) => {
      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);

          if (data.type === 'hello') {
            expect(data.token).toBeDefined();

            // Reject invalid token
            if (data.token !== 'valid-token') {
              ws.close(1008, 'Invalid token');
            }
          }
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'hello',
          token: 'invalid-token'
        }));
      });

      wsClient.on('close', (event) => {
        expect(event.code).toBe(1008);
        expect(event.reason).toBe('Invalid token');
        done();
      });
    });

    it('accepts valid authentication tokens', (done) => {
      let authenticated = false;

      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);

          if (data.type === 'hello' && data.token === 'valid-token') {
            ws.userId = 'user-123';
            authenticated = true;
            done();
          }
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'hello',
          token: 'valid-token'
        }));
      });
    });
  });

  describe('Message Handling', () => {
    it('receives and parses JSON messages', (done) => {
      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);
          expect(data.type).toBe('test');
          expect(data.payload).toBe('hello');
          done();
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'test',
          payload: 'hello'
        }));
      });
    });

    it('handles malformed JSON gracefully', (done) => {
      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          // Should not crash
          expect(() => JSON.parse(message)).not.toThrow();
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send('invalid json');
        done();
      });
    });

    it('responds to ping messages with pong', (done) => {
      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('message', (message: string) => {
        const data = JSON.parse(message);
        expect(data.type).toBe('pong');
        done();
      });

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({ type: 'ping' }));
      });
    });
  });

  describe('Channel Subscription', () => {
    it('allows clients to subscribe to channels', (done) => {
      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);

          if (data.type === 'sub') {
            wsServer.subscribeToChannel(ws, data.channel);
            expect(ws.subscriptions.has(data.channel)).toBe(true);
            done();
          }
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'sub',
          channel: 'session:abc-123'
        }));
      });
    });

    it('allows clients to unsubscribe from channels', (done) => {
      wsServer.on('connection', (ws: any) => {
        let subscribed = false;

        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);

          if (data.type === 'sub') {
            wsServer.subscribeToChannel(ws, data.channel);
            subscribed = true;
          } else if (data.type === 'unsub' && subscribed) {
            wsServer.unsubscribeFromChannel(ws, data.channel);
            expect(ws.subscriptions.has(data.channel)).toBe(false);
            done();
          }
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        // Subscribe
        wsClient.send(JSON.stringify({
          type: 'sub',
          channel: 'session:abc-123'
        }));

        // Unsubscribe
        setTimeout(() => {
          wsClient.send(JSON.stringify({
            type: 'unsub',
            channel: 'session:abc-123'
          }));
        }, 100);
      });
    });
  });

  describe('Broadcasting', () => {
    it('broadcasts messages to subscribed clients', (done) => {
      let receivedCount = 0;

      // Create two clients
      const client1 = new WebSocket(`ws://localhost:${PORT}/ws`);
      const client2 = new WebSocket(`ws://localhost:${PORT}/ws`);

      let client1Ready = false;
      let client2Ready = false;

      client1.on('open', () => {
        client1.send(JSON.stringify({
          type: 'sub',
          channel: 'session:test'
        }));
        client1Ready = true;

        if (client1Ready && client2Ready) {
          // Broadcast message
          wsServer.broadcastToChannel('session:test', {
            type: 'message',
            data: 'Hello'
          });
        }
      });

      client2.on('open', () => {
        client2.send(JSON.stringify({
          type: 'sub',
          channel: 'session:test'
        }));
        client2Ready = true;

        if (client1Ready && client2Ready) {
          // Broadcast message
          wsServer.broadcastToChannel('session:test', {
            type: 'message',
            data: 'Hello'
          });
        }
      });

      client1.on('message', (message: string) => {
        const data = JSON.parse(message);
        if (data.type === 'message') {
          receivedCount++;

          if (receivedCount === 2) {
            done();
          }
        }
      });

      client2.on('message', (message: string) => {
        const data = JSON.parse(message);
        if (data.type === 'message') {
          receivedCount++;

          if (receivedCount === 2) {
            done();
          }
        }
      });
    });

    it('does not broadcast to unsubscribed clients', (done) => {
      let client1Received = false;
      let client2Received = false;

      const client1 = new WebSocket(`ws://localhost:${PORT}/ws`);
      const client2 = new WebSocket(`ws://localhost:${PORT}/ws`);

      client1.on('open', () => {
        client1.send(JSON.stringify({
          type: 'sub',
          channel: 'session:test'
        }));
      });

      client2.on('open', () => {
        // Client 2 does not subscribe

        // Broadcast message
        setTimeout(() => {
          wsServer.broadcastToChannel('session:test', {
            type: 'message',
            data: 'Hello'
          });

          setTimeout(() => {
            expect(client1Received).toBe(true);
            expect(client2Received).toBe(false);
            done();
          }, 100);
        }, 100);
      });

      client1.on('message', (message: string) => {
        const data = JSON.parse(message);
        if (data.type === 'message') {
          client1Received = true;
        }
      });

      client2.on('message', (message: string) => {
        const data = JSON.parse(message);
        if (data.type === 'message') {
          client2Received = true;
        }
      });
    });
  });

  describe('Agent Streaming', () => {
    it('sends streaming text chunks', (done) => {
      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);

          if (data.type === 'sub') {
            wsServer.subscribeToChannel(ws, data.channel);

            // Simulate streaming
            const chunks = ['Hello', ' ', 'World', '!'];
            let index = 0;

            const interval = setInterval(() => {
              if (index < chunks.length) {
                wsServer.sendStreamChunk(ws, {
                  channel: data.channel,
                  chunk: chunks[index],
                  done: index === chunks.length - 1
                });
                index++;
              } else {
                clearInterval(interval);
              }
            }, 50);
          }
        });
      });

      let receivedChunks: string[] = [];

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'sub',
          channel: 'session:test'
        }));
      });

      wsClient.on('message', (message: string) => {
        const data = JSON.parse(message);

        if (data.type === 'chunk') {
          receivedChunks.push(data.content);
        } else if (data.type === 'done') {
          expect(receivedChunks.join('')).toBe('Hello World!');
          expect(data.done).toBe(true);
          done();
        }
      });
    });

    it('sends tool call events', (done) => {
      wsServer.on('connection', (ws: any) => {
        wsServer.on('message', (ws: any, message: string) => {
          const data = JSON.parse(message);

          if (data.type === 'sub') {
            wsServer.subscribeToChannel(ws, data.channel);

            // Send tool call event
            wsServer.sendToolCall(ws, {
              channel: data.channel,
              toolCall: {
                id: 'tool-123',
                name: 'read-file',
                arguments: { path: '/test.txt' }
              }
            });
          }
        });
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'sub',
          channel: 'session:test'
        }));
      });

      wsClient.on('message', (message: string) => {
        const data = JSON.parse(message);

        if (data.type === 'tool_call') {
          expect(data.toolCall).toBeDefined();
          expect(data.toolCall.name).toBe('read-file');
          expect(data.toolCall.arguments.path).toBe('/test.txt');
          done();
        }
      });
    });
  });

  describe('Heartbeat', () => {
    it('responds to ping with pong', (done) => {
      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('message', (message: string) => {
        const data = JSON.parse(message);
        expect(data.type).toBe('pong');
        done();
      });

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({ type: 'ping' }));
      });
    });

    it('automatically sends ping to keep connection alive', (done) => {
      const pingInterval = 100; // Short interval for testing

      wsServer = new WebSocketServer({
        server: httpServer,
        path: '/ws',
        pingInterval
      });

      let pingReceived = false;

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);

      wsClient.on('message', (message: string) => {
        const data = JSON.parse(message);

        if (data.type === 'ping') {
          pingReceived = true;

          // Respond with pong
          wsClient.send(JSON.stringify({ type: 'pong' }));

          setTimeout(() => {
            expect(pingReceived).toBe(true);
            wsServer.close();
            done();
          }, 200);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles connection errors gracefully', (done) => {
      // Try to connect to non-existent server
      const badClient = new WebSocket(`ws://localhost:9999/ws`);

      badClient.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    it('logs errors without crashing', (done) => {
      wsServer.on('connection', (ws: any) => {
        // Send invalid message
        ws.send('invalid');

        // Server should still be running
        expect(wsServer.getClientCount()).toBe(1);
        done();
      });

      wsClient = new WebSocket(`ws://localhost:${PORT}/ws`);
      wsClient.on('open', () => done());
    });
  });

  describe('Cleanup', () => {
    it('closes all connections on server shutdown', (done) => {
      const clients: WebSocket[] = [];

      wsServer.on('connection', (ws: any) => {
        clients.push(ws);

        if (clients.length === 3) {
          // Close server
          wsServer.close();

          // All clients should be closed
          setTimeout(() => {
            const allClosed = clients.every(c => c.readyState === WebSocket.CLOSED);
            expect(allClosed).toBe(true);
            done();
          }, 100);
        }
      });

      // Create 3 connections
      for (let i = 0; i < 3; i++) {
        const client = new WebSocket(`ws://localhost:${PORT}/ws`);
        clients.push(client);
      }
    });
  });
});
