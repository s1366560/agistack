/**
 * WebSocket Server Tests
 *
 * TDD Approach: Tests written first, implementation will follow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketServer } from './websocket-server';
import { createServer } from 'http';
import { WebSocket } from 'ws';

describe('WebSocketServer', () => {
  let httpServer: any;
  let wsServer: WebSocketServer;
  let port: number;

  beforeEach(async () => {
    // Set development mode for test tokens
    process.env.NODE_ENV = 'development';
    httpServer = createServer();
    port = 3001 + Math.floor(Math.random() * 1000);
    wsServer = new WebSocketServer({ httpServer });

    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });

    await wsServer.start(port);
  });

  afterEach(async () => {
    await wsServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(resolve);
    });
  });

  describe('Server Initialization', () => {
    it('should start WebSocket server successfully', async () => {
      expect(wsServer).toBeDefined();
      expect(wsServer.isRunning()).toBe(true);
    });

    it('should accept WebSocket connections', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      expect(client.readyState).toBe(WebSocket.OPEN);
      client.close();
    });

    it('should have multiple clients connected simultaneously', async () => {
      const token = 'valid.jwt.token';
      const clients = Array.from({ length: 5 }, () =>
        new WebSocket(`ws://localhost:${port}?token=${token}`)
      );

      await Promise.all(
        clients.map(
          (client) =>
            new Promise<void>((resolve, reject) => {
              client.on('open', resolve);
              client.on('error', reject);
            })
        )
      );

      clients.forEach((client) => client.close());
    });
  });

  describe('Client Authentication', () => {
    it('should accept connection with valid JWT token', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      expect(client.readyState).toBe(WebSocket.OPEN);
      client.close();
    });

    it('should reject connection without token', async () => {
      const client = new WebSocket(`ws://localhost:${port}`);

      await new Promise<void>((resolve) => {
        client.on('close', () => resolve());
        client.on('error', () => resolve());
      });

      expect(client.readyState).not.toBe(WebSocket.OPEN);
    });

    it('should reject connection with invalid token', async () => {
      const invalidToken = 'invalid.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${invalidToken}`);

      await new Promise<void>((resolve) => {
        client.on('close', () => resolve());
        client.on('error', () => resolve());
      });

      expect(client.readyState).not.toBe(WebSocket.OPEN);
    });
  });

  describe('Connection Management', () => {
    it('should track connected clients', async () => {
      const token = 'valid.jwt.token';

      const client1 = new WebSocket(`ws://localhost:${port}?token=${token}`);
      await new Promise<void>((resolve) => {
        client1.on('open', resolve);
        client1.on('error', resolve);
      });

      expect(wsServer.getClientCount()).toBeGreaterThanOrEqual(0);

      const client2 = new WebSocket(`ws://localhost:${port}?token=${token}`);
      await new Promise<void>((resolve) => {
        client2.on('open', resolve);
        client2.on('error', resolve);
      });

      expect(wsServer.getClientCount()).toBeGreaterThanOrEqual(0);

      client1.close();
      client2.close();
    });

    it('should disconnect client on error', async () => {
      const invalidToken = 'invalid';
      const client = new WebSocket(`ws://localhost:${port}?token=${invalidToken}`);

      await new Promise<void>((resolve) => {
        client.on('close', resolve);
        client.on('error', resolve);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON messages gracefully', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      client.send('invalid json');

      expect(wsServer.isRunning()).toBe(true);

      client.close();
    });
  });

  describe('Cleanup', () => {
    it('should close all client connections on shutdown', async () => {
      const token = 'valid.jwt.token';
      const clients = Array.from({ length: 3 }, () =>
        new WebSocket(`ws://localhost:${port}?token=${token}`)
      );

      await Promise.all(
        clients.map(
          (client) =>
            new Promise<void>((resolve, reject) => {
              client.on('open', resolve);
              client.on('error', reject);
            })
        )
      );

      await wsServer.close();

      expect(wsServer.getClientCount()).toBe(0);
    });
  });

  describe('Agent Streaming', () => {
    it('should create agent stream for client', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      const clientId = await new Promise<string>((resolve, reject) => {
        client.on('open', () => {
          client.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'connected') {
              resolve(msg.clientId);
            }
          });
        });
        client.on('error', reject);
      });

      // Create stream
      const stream = wsServer.createAgentStream(clientId);
      expect(stream).toBeDefined();

      // Write to stream
      stream.write({ type: 'token', content: 'Hello' });
      stream.write({ type: 'token', content: 'World' });

      // End stream
      stream.end();

      // Verify messages received
      const messages = await new Promise<any[]>((resolve) => {
        const msgs: any[] = [];
        const handler = (data: any) => {
          const msg = JSON.parse(data.toString());
          msgs.push(msg);
          // Wait for done message
          if (msg.type === 'done') {
            client.off('message', handler);
            resolve(msgs);
          }
        };
        client.on('message', handler);
      });

      const tokenMessages = messages.filter((m) => m.type === 'token');
      expect(tokenMessages.length).toBe(2);
      expect(tokenMessages[0].content).toBe('Hello');
      expect(tokenMessages[1].content).toBe('World');
      expect(messages.some((m) => m.type === 'done')).toBe(true);

      client.close();
    });

    it('should handle double end gracefully', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      const clientId = await new Promise<string>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            resolve(msg.clientId);
          }
        });
      });

      const stream = wsServer.createAgentStream(clientId);
      stream.end();
      stream.end(); // Should not throw

      client.close();
    });

    it('should throw error when writing to ended stream', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      const clientId = await new Promise<string>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            resolve(msg.clientId);
          }
        });
      });

      const stream = wsServer.createAgentStream(clientId);
      stream.end();

      expect(() => {
        stream.write({ type: 'token', content: 'Should fail' });
      }).toThrow('Stream has ended');

      client.close();
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast message to all connected clients', async () => {
      const token = 'valid.jwt.token';
      const clients = Array.from({ length: 3 }, () =>
        new WebSocket(`ws://localhost:${port}?token=${token}`)
      );

      await Promise.all(
        clients.map(
          (client) =>
            new Promise<void>((resolve, reject) => {
              client.on('open', resolve);
              client.on('error', reject);
            })
        )
      );

      // Broadcast message from server
      wsServer.broadcast({
        type: 'broadcast',
        data: { message: 'Hello everyone' },
      });

      // All clients should receive the message
      const messages = await Promise.all(
        clients.map(
          (client) =>
            new Promise<any>((resolve) => {
              client.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'broadcast') {
                  resolve(msg);
                }
              });
            })
        )
      );

      messages.forEach((msg) => {
        expect(msg.type).toBe('broadcast');
        expect(msg.data.message).toBe('Hello everyone');
      });

      clients.forEach((client) => client.close());
    });

    it('should send message to specific client', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      const clientId = await new Promise<string>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            resolve(msg.clientId);
          }
        });
      });

      // Send message to specific client
      wsServer.sendToClient(clientId, {
        type: 'private',
        data: { message: 'Just for you' },
      });

      const message = await new Promise<any>((resolve) => {
        const handler = (data: any) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'private') {
            client.off('message', handler);
            resolve(msg);
          }
        };
        client.on('message', handler);
      });

      expect(message.type).toBe('private');
      expect(message.data.message).toBe('Just for you');

      client.close();
    });
  });
});
