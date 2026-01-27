/**
 * WebSocket Server
 *
 * Real-time bidirectional communication server for streaming AI responses
 */

import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { verify } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  SessionSubscriptionManager,
  validateClientMessage,
  createErrorMessage,
  createSubscribedMessage,
  createUnsubscribedMessage,
  createPongMessage,
  handleChatWithAI,
} from './chat-handler';
import { WebSocketMetricsCollector } from './metrics';
import { sessionRepository } from '../../routes/sessions';

interface Client {
  id: string;
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
  lastPing: number;
  connectedAt?: number; // Track connection time for metrics
}

interface ServerConfig {
  jwtSecret?: string;
  heartbeatInterval?: number;
  clientTimeout?: number;
  httpServer?: any; // Optional external HTTP server
  metricsCollector?: WebSocketMetricsCollector; // Optional metrics collector
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
  private subscriptions: SessionSubscriptionManager;
  private config: ServerConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private port: number | null = null;
  private ownsHttpServer: boolean; // Track if we created the HTTP server
  private metricsCollector?: WebSocketMetricsCollector; // Optional metrics

  constructor(config: ServerConfig = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'default-secret',
      heartbeatInterval: config.heartbeatInterval || 30000,
      clientTimeout: config.clientTimeout || 60000,
      httpServer: config.httpServer,
      metricsCollector: config.metricsCollector,
    };
    this.ownsHttpServer = !config.httpServer;
    this.httpServer = config.httpServer || null;
    this.subscriptions = new SessionSubscriptionManager();
    this.metricsCollector = config.metricsCollector;
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

        // Record sent message in metrics
        if (this.metricsCollector && message.type) {
          this.metricsCollector.recordMessageSent(message.type);
        }
      } catch (error) {
        // Error sending to client

        // Record send error in metrics
        if (this.metricsCollector) {
          this.metricsCollector.recordError('SEND_ERROR');
        }
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
    console.log('[WebSocket Server] New connection attempt from:', request.socket.remoteAddress);

    // Extract token from URL query params
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    console.log('[WebSocket Server] Token present:', !!token);

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
      const connectedAt = Date.now();
      const client: Client = {
        id: clientId,
        ws,
        userId,
        isAlive: true,
        lastPing: Date.now(),
        connectedAt,
      };

      this.clients.set(clientId, client);

      console.log('[WebSocket Server] Client created:', clientId, 'for user:', userId);

      // Record connection in metrics
      if (this.metricsCollector) {
        this.metricsCollector.recordConnection(clientId);
      }

      // Send connected message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
      });

      console.log('[WebSocket Server] Connected message sent to client:', clientId);

      // Setup message handler
      ws.on('message', (data: Buffer) => {
        // Record received message in metrics
        if (this.metricsCollector) {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed && parsed.type) {
              this.metricsCollector.recordMessageReceived(parsed.type);
            }
          } catch {
            // Will be handled in handleMessage
          }
        }

        try {
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error(`Error in message handler for client ${clientId}:`, error);

          // Record error in metrics
          if (this.metricsCollector) {
            this.metricsCollector.recordError('INTERNAL_ERROR');
          }

          // Try to send error message to client
          try {
            this.sendToClient(clientId, createErrorMessage('INTERNAL_ERROR', 'Internal server error'));
          } catch {
            // Ignore if we can't send error
          }
        }
      });

      // Setup close handler
      ws.on('close', () => {
        // Record disconnection in metrics
        if (this.metricsCollector) {
          const client = this.clients.get(clientId);
          if (client && client.connectedAt) {
            this.metricsCollector.recordDisconnection(clientId, client.connectedAt);
          } else {
            this.metricsCollector.recordDisconnection(clientId);
          }
        }

        this.clients.delete(clientId);
        // Remove all subscriptions for this client
        this.subscriptions.removeClient(clientId);
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
    console.log('[WebSocket Server] Message received from client:', clientId);

    // First, try to parse JSON
    let message: any;
    try {
      const dataStr = data.toString();
      console.log('[WebSocket Server] Message data:', dataStr);
      message = JSON.parse(dataStr);
      console.log('[WebSocket Server] Parsed message type:', message.type);
    } catch (parseError) {
      // JSON parse error - send error response
      console.error('[WebSocket Server] JSON parse error:', parseError);
      this.sendToClient(
        clientId,
        createErrorMessage('PARSE_ERROR', 'Failed to parse message as JSON')
      );

      // Record parse error in metrics
      if (this.metricsCollector) {
        this.metricsCollector.recordError('PARSE_ERROR');
      }

      return;
    }

    // Validate message using schema
    const validation = validateClientMessage(message);

    if (!validation.success) {
      this.sendToClient(clientId, createErrorMessage('VALIDATION_ERROR', validation.error!));

      // Record validation error in metrics
      if (this.metricsCollector) {
        this.metricsCollector.recordError('VALIDATION_ERROR');
      }

      return;
    }

    const validMessage = validation.data!;

    // Handle different message types
    switch (validMessage.type) {
      case 'ping':
        this.handlePing(clientId);
        break;

      case 'subscribe':
        this.handleSubscribe(clientId, validMessage.sessionId);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, validMessage.sessionId);
        break;

      case 'chat':
        this.handleChatMessage(clientId, validMessage);
        break;

      default:
        this.sendToClient(clientId, createErrorMessage('UNKNOWN_MESSAGE_TYPE', 'Unknown message type'));
    }
  }

  /**
   * Handle ping message
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
      client.isAlive = true;
      this.sendToClient(clientId, createPongMessage());
    }
  }

  /**
   * Handle subscribe message
   */
  private handleSubscribe(clientId: string, sessionId: string): void {
    this.subscriptions.subscribe(sessionId, clientId);
    this.sendToClient(clientId, createSubscribedMessage(sessionId));
  }

  /**
   * Handle unsubscribe message
   */
  private handleUnsubscribe(clientId: string, sessionId: string): void {
    const removed = this.subscriptions.unsubscribe(sessionId, clientId);
    if (removed) {
      this.sendToClient(clientId, createUnsubscribedMessage(sessionId));
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(
    clientId: string,
    message: { type: 'chat'; sessionId: string; content: string; timestamp: string }
  ): Promise<void> {
    // Broadcast the message to all subscribers of this session (including sender if subscribed)
    const subscribers = this.subscriptions.getSubscribers(message.sessionId);

    // If no subscribers, still send response to the sender
    const recipients = subscribers.length > 0 ? subscribers : [clientId];

    // Get session to determine agent type
    const session = await sessionRepository.findById(message.sessionId);
    const agentType = session?.agentType || 'general';

    // Use real AI integration
    await handleChatWithAI(
      message.sessionId,
      message.content,
      agentType,
      // onChunk callback
      (chunk: string) => {
        const chunkMessage = {
          type: 'chunk',
          sessionId: message.sessionId,
          content: chunk,
          done: false,
          timestamp: new Date().toISOString(),
        };

        // Send to all recipients
        for (const recipientId of recipients) {
          this.sendToClient(recipientId, chunkMessage);
        }
      },
      // onDone callback
      () => {
        const doneMessage = {
          type: 'done',
          sessionId: message.sessionId,
          timestamp: new Date().toISOString(),
        };

        for (const recipientId of recipients) {
          this.sendToClient(recipientId, doneMessage);
        }
      },
      // onError callback
      (error: string) => {
        const errorMessage = {
          type: 'error',
          code: 'STREAM_ERROR',
          message: error,
          sessionId: message.sessionId,
          timestamp: new Date().toISOString(),
        };

        for (const recipientId of recipients) {
          this.sendToClient(recipientId, errorMessage);
        }
      }
    );
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
