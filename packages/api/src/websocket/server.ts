/**
 * WebSocket Server
 *
 * Manages WebSocket connections for real-time AI agent communication
 * Supports authentication, channel subscriptions, and message broadcasting
 */

import { EventEmitter } from 'events';
import { WebSocketServer as WSWebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { WebSocket as WebSocketType } from 'ws';

/**
 * WebSocket client interface
 */
export interface WebSocketClient extends WebSocketType {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
}

/**
 * Server configuration
 */
export interface WebSocketServerConfig {
  server?: any;
  path?: string;
  pingInterval?: number;
  clientTracking?: boolean;
}

/**
 * Stream chunk for streaming responses
 */
export interface StreamChunkMessage {
  type: 'chunk';
  content: string;
  done: boolean;
}

/**
 * Tool call message
 */
export interface ToolCallMessage {
  type: 'tool_call';
  toolCall: {
    id: string;
    name: string;
    arguments: Record<string, any>;
  };
}

/**
 * Generic message from server
 */
export interface ServerMessage {
  type: 'message' | 'chunk' | 'done' | 'tool_call' | 'ping' | 'pong' | 'error';
  [key: string]: any;
}

/**
 * WebSocket Server Class
 */
export class WebSocketServer extends EventEmitter {
  private wss: WSWebSocketServer;
  private clients: Map<WebSocketType, WebSocketClient> = new Map();
  private pingTimer?: NodeJS.Timeout;
  private config: WebSocketServerConfig;

  constructor(config: WebSocketServerConfig = {}) {
    this.config = {
      pingInterval: 30000, // 30 seconds
      clientTracking: true,
      ...config,
    };

    // Initialize WebSocket server
    this.wss = new WSWebSocketServer({
      ...this.config,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for the WebSocket server
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocketType, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('close', () => {
      this.emit('close');
    });

    // Start heartbeat if configured
    if (this.config.pingInterval && this.config.pingInterval > 0) {
      this.startHeartbeat();
    }
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocketType, req: IncomingMessage): void {
    // Create client wrapper
    const client: WebSocketClient = {
      id: this.generateClientId(),
      subscriptions: new Set(),
      ...ws,
    };

    // Track client
    if (this.config.clientTracking) {
      this.clients.set(ws, client);
    }

    // Setup message handler
    ws.on('message', (data: Buffer) => {
      this.handleMessage(client, data.toString());
    });

    // Setup close handler
    ws.on('close', () => {
      this.handleDisconnection(client);
    });

    // Emit connection event
    this.emit('connection', client);
  }

  /**
   * Handle incoming messages from client
   */
  private handleMessage(client: WebSocketClient, message: string): void {
    try {
      const data = JSON.parse(message);
      this.emit('message', client, data);

      // Handle specific message types
      switch (data.type) {
        case 'ping':
          this.sendToClient(client, { type: 'pong' });
          break;

        case 'pong':
          // Client responded to ping
          break;

        case 'sub':
          if (data.channel) {
            this.subscribeToChannel(client, data.channel);
          }
          break;

        case 'unsub':
          if (data.channel) {
            this.unsubscribeFromChannel(client, data.channel);
          }
          break;

        case 'hello':
          // Authentication handshake
          this.handleAuthentication(client, data);
          break;

        default:
          // Emit for custom handling
          this.emit(data.type, client, data);
          break;
      }
    } catch (error) {
      // Malformed JSON or other error
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(client: WebSocketClient): void {
    // Remove from tracking
    if (this.config.clientTracking) {
      this.clients.delete(client);
    }

    this.emit('disconnection', client);
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(client: WebSocketClient, data: any): void {
    // TODO: Implement actual JWT validation
    // For now, accept any non-empty token
    if (data.token && data.token !== 'invalid') {
      client.userId = this.extractUserIdFromToken(data.token);
      this.sendToClient(client, {
        type: 'authenticated',
        userId: client.userId
      });
    } else {
      client.close(1008, 'Invalid token');
    }
  }

  /**
   * Extract user ID from token
   */
  private extractUserIdFromToken(token: string): string {
    // TODO: Implement actual JWT parsing
    // For now, return a placeholder
    return `user-${token.substring(0, 8)}`;
  }

  /**
   * Subscribe client to a channel
   */
  subscribeToChannel(client: WebSocketClient, channel: string): void {
    client.subscriptions.add(channel);
    this.emit('subscription', client, channel);
  }

  /**
   * Unsubscribe client from a channel
   */
  unsubscribeFromChannel(client: WebSocketClient, channel: string): void {
    client.subscriptions.delete(channel);
    this.emit('unsubscription', client, channel);
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  broadcastToChannel(channel: string, message: ServerMessage): void {
    for (const [ws, client] of this.clients) {
      if (client.subscriptions.has(channel) && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(client: WebSocketClient, message: ServerMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Send streaming text chunk to client
   */
  sendStreamChunk(client: WebSocketClient, params: {
    channel: string;
    chunk: string;
    done: boolean;
  }): void {
    const chunkMessage: StreamChunkMessage = {
      type: 'chunk',
      content: params.chunk,
      done: params.done,
    };

    this.sendToClient(client, chunkMessage);

    // Send done message if stream is complete
    if (params.done) {
      this.sendToClient(client, {
        type: 'done',
        channel: params.channel,
      });
    }
  }

  /**
   * Send tool call event to client
   */
  sendToolCall(client: WebSocketClient, params: {
    channel: string;
    toolCall: {
      id: string;
      name: string;
      arguments: Record<string, any>;
    };
  }): void {
    const toolMessage: ToolCallMessage = {
      type: 'tool_call',
      toolCall: params.toolCall,
    };

    this.sendToClient(client, toolMessage);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(message: ServerMessage): void {
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    }
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
  getClients(): Map<WebSocketType, WebSocketClient> {
    return this.clients;
  }

  /**
   * Get client by ID
   */
  getClientById(id: string): WebSocketClient | undefined {
    for (const [, client] of this.clients) {
      if (client.id === id) {
        return client;
      }
    }
    return undefined;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      // Send ping to all connected clients
      this.broadcast({ type: 'ping' });
    }, this.config.pingInterval!);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  /**
   * Close all connections and shutdown server
   */
  close(): void {
    this.stopHeartbeat();

    // Close all client connections
    for (const [ws] of this.clients) {
      ws.close();
    }

    // Close server
    this.wss.close();
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}
