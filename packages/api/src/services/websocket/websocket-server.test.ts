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

  // Increase test timeout
  const testTimeout = 15000;

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer();
    port = 3001 + Math.floor(Math.random() * 1000);

    // Create WebSocket server
    wsServer = new WebSocketServer({ httpServer });

    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });
  });

  afterEach(async () => {
    await wsServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(resolve);
    });
  });

  describe('Server Initialization', () => {
    it('should start WebSocket server successfully', async () => {
      const client = new WebSocket(`ws://localhost:${port}`);
      expect(wsServer).toBeDefined();
      expect(wsServer.isRunning()).toBe(true);
    });

    it('should accept WebSocket connections', async () => {
      const client = new WebSocket(`ws://localhost:${port}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      expect(client.readyState).toBe(WebSocket.OPEN);
      client.close();
    });

    it('should have multiple clients connected simultaneously', async () => {
      const clients = Array.from({ length: 5 }, () =>
        new WebSocket(`ws://localhost:${port}`)
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

      // Connection should be closed or error
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

  describe('Heartbeat Detection', () => {
    it('should respond to ping with pong', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      client.send(JSON.stringify({ type: 'ping' }));

      const message = await new Promise<any>((resolve) => {
        client.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(message.type).toBe('pong');
      client.close();
    });

    it('should detect disconnected clients after timeout', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      // Get client ID from connection
      const clientId = await new Promise<string>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            resolve(msg.clientId);
          }
        });
      });

      // Stop sending heartbeats
      const beforeClients = wsServer.getClientCount();

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 35000));

      const afterClients = wsServer.getClientCount();

      expect(afterClients).toBeLessThan(beforeClients);
      client.close();
    }).timeout(40000);
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
                resolve(JSON.parse(data.toString()));
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

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      // Get client ID
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
        client.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(message.type).toBe('private');
      expect(message.data.message).toBe('Just for you');
      client.close();
    });
  });

  describe('Agent Streaming Output', () => {
    it('should stream agent response to client', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      // Get client ID
      const clientId = await new Promise<string>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'connected') {
            resolve(msg.clientId);
          }
        });
      });

      // Stream agent response
      const stream = wsServer.createAgentStream(clientId);

      stream.write({ type: 'token', content: 'Hello' });
      stream.write({ type: 'token', content: ' World' });
      stream.end();

      const messages = await new Promise<any[]>((resolve) => {
        const msgs: any[] = [];
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          msgs.push(msg);
          if (msg.type === 'done') {
            resolve(msgs);
          }
        });
      });

      const tokenMessages = messages.filter((m) => m.type === 'token');
      expect(tokenMessages).toHaveLength(2);
      expect(tokenMessages[0].content).toBe('Hello');
      expect(tokenMessages[1].content).toBe('World');

      client.close();
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

      expect(wsServer.getClientCount()).toBe(1);

      const client2 = new WebSocket(`ws://localhost:${port}?token=${token}`);
      await new Promise<void>((resolve) => {
        client2.on('open', resolve);
        client2.on('error', resolve);
      });

      expect(wsServer.getClientCount()).toBe(2);

      client1.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wsServer.getClientCount()).toBe(1);

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

      // Send invalid JSON
      client.send('invalid json');

      // Should not crash
      expect(wsServer.isRunning()).toBe(true);

      client.close();
    });

    it('should handle large messages without crashing', async () => {
      const token = 'valid.jwt.token';
      const client = new WebSocket(`ws://localhost:${port}?token=${token}`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
      });

      // Send large message
      const largeData = 'x'.repeat(100000);
      wsServer.sendToClient('dummy-client-id', {
        type: 'large',
        data: largeData,
      });

      // Should still work
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

      // All clients should be disconnected
      expect(wsServer.getClientCount()).toBe(0);
    });
  });
});
