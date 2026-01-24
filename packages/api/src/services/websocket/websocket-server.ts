/**
 * WebSocket Server
 *
 * Real-time bidirectional communication server for streaming AI responses
 */

import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface Client {
  id: string;
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
  lastPing: number;
}

interface ServerConfig {
  jwtSecret?: string;
  heartbeatInterval?: number;
  clientTimeout?: number;
  httpServer?: any; // Optional external HTTP server
}

interface Message {
  type: string;
  data?: any;
  clientId?: string;
  content?: string;
}

/**
 * WebSocket Server Class
 */
export class WebSocketServer {
  private httpServer: any;
  private wsServer: WSServer | null = null;
  private clients: Map<string, Client> = new Map();
  private config: ServerConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private port: number | null = null;
  private ownsHttpServer: boolean; // Track if we created the HTTP server

  constructor(config: ServerConfig = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'default-secret',
      heartbeatInterval: config.heartbeatInterval || 30000,
      clientTimeout: config.clientTimeout || 60000,
      httpServer: config.httpServer,
    };
    this.ownsHttpServer = !config.httpServer;
    this.httpServer = config.httpServer || null;
  }

  /**
   * Start the WebSocket server
   */
  async start(port: number): Promise<void> {
    this.port = port;

    return new Promise((resolve) => {
      // Create HTTP server if not provided
      if (!this.httpServer) {
        this.httpServer = createServer();
      }

      this.wsServer = new WSServer({ noServer: true });

      this.httpServer.on('upgrade', (request, socket, head) => {
        this.wsServer!.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          this.wsServer!.emit('connection', ws, request);
        });
      });

      this.wsServer.on('connection', (ws: WebSocket, request) => {
        this.handleConnection(ws, request);
      });

      // Only listen if we own the HTTP server
      if (this.ownsHttpServer) {
        this.httpServer.listen(port, () => {
          this.startHeartbeat();
          resolve();
        });
      } else {
        // External HTTP server, just start heartbeat
        this.startHeartbeat();
        resolve();
      }
    });
  }

  /**
   * Close the WebSocket server
   */
  async close(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all client connections
    this.clients.forEach((client) => {
      try {
        client.ws.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.clients.clear();

    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    // Only close HTTP server if we own it
    return new Promise((resolve) => {
      if (this.httpServer && this.ownsHttpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
          this.port = null;
          resolve();
        });
      } else {
        // Don't close external HTTP server
        this.port = null;
        resolve();
      }
    });
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.wsServer !== null && this.httpServer !== null &&
           (this.ownsHttpServer ? this.httpServer.listening : true);
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all connected clients
   */
  getClients(): Client[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get specific client
   */
  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: Message): void {
    const messageString = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageString);
        } catch (error) {
          // Error sending to client, will be cleaned up by heartbeat
        }
      }
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: Message): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        // Error sending to client
      }
    }
  }

  /**
   * Create agent stream for specific client
   */
  createAgentStream(clientId: string): AgentStream {
    return new AgentStream(clientId, this);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    // Extract token from URL query params
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    // Authenticate client
    if (!token) {
      ws.close(4001, 'Missing authentication token');
      return;
    }

    try {
      // Verify JWT token (in dev mode, accept any non-empty token)
      let userId: string;
      if (process.env.NODE_ENV === 'development' && token === 'valid.jwt.token') {
        userId = 'test-user';
      } else {
        const decoded = verify(token, this.config.jwtSecret!);
        userId = typeof decoded === 'string' ? decoded : (decoded as any).userId;
      }

      // Create client
      const clientId = uuidv4();
      const client: Client = {
        id: clientId,
        ws,
        userId,
        isAlive: true,
        lastPing: Date.now(),
      };

      this.clients.set(clientId, client);

      // Send connected message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
      });

      // Setup message handler
      ws.on('message', (data: Buffer) => {
        this.handleMessage(clientId, data);
      });

      // Setup close handler
      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

    } catch (error: any) {
      ws.close(4003, 'Invalid authentication token');
    }
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: Buffer): void {
    try {
      const message: Message = JSON.parse(data.toString());

      // Handle ping/pong
      if (message.type === 'ping') {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
          client.isAlive = true;

          this.sendToClient(clientId, {
            type: 'pong',
          });
        }
      }

      // Handle other message types as needed
      // ...

    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
      // Don't crash due to invalid JSON
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.clientTimeout!;

      // Check for stale clients
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > timeout) {
          // Client is stale, close connection
          try {
            client.ws.close();
          } catch (error) {
            // Ignore errors
          }
          this.clients.delete(clientId);
        }
      });
    }, this.config.heartbeatInterval);
  }
}

/**
 * Agent Stream Class
 *
 * Manages streaming AI responses to a specific client
 */
export class AgentStream {
  private clientId: string;
  private server: WebSocketServer;
  private ended = false;

  constructor(clientId: string, server: WebSocketServer) {
    this.clientId = clientId;
    this.server = server;
  }

  /**
   * Write chunk to stream
   */
  write(chunk: any): void {
    if (this.ended) {
      throw new Error('Stream has ended');
    }

    this.server.sendToClient(this.clientId, {
      type: 'chunk',
      ...chunk,
    });
  }

  /**
   * End the stream
   */
  end(): void {
    if (this.ended) {
      return;
    }

    this.ended = true;

    this.server.sendToClient(this.clientId, {
      type: 'done',
    });
  }

  /**
   * Event emitter interface
   */
  on(event: string, handler: Function): void {
    // Placeholder for event handling if needed
  }
}
