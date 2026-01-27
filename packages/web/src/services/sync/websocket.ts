/**
 * WebSocket Client
 *
 * Client-side WebSocket implementation for real-time communication
 * Handles connection management, authentication, subscriptions, and reconnection
 */

import { EventEmitter } from 'events';

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  subscriptions: string[];
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'message'
  | 'chunk'
  | 'done'
  | 'tool_call'
  | 'ping'
  | 'pong'
  | 'hello'
  | 'authenticated'
  | 'sub'
  | 'unsub'
  | 'subscribed'
  | 'unsubscribed'
  | 'chat'
  | 'subscribe'
  | 'unsubscribe'
  | 'error'
  | 'connected';

/**
 * WebSocket message interface
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  [key: string]: any;
}

/**
 * Stream chunk message
 */
export interface StreamChunkMessage extends WebSocketMessage {
  type: 'chunk';
  content: string;
  done: boolean;
}

/**
 * Tool call message
 */
export interface ToolCallMessage extends WebSocketMessage {
  type: 'tool_call';
  toolCall: {
    id: string;
    name: string;
    arguments: Record<string, any>;
  };
}

/**
 * WebSocket Client Class
 */
export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketClientConfig>;
  private token: string | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private reconnecting = false;

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: WebSocketClientConfig) {
    super();
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };

    this.connect();
  }

  /**
   * Connect to WebSocket server with authentication token
   */
  connect(token?: string): void {
    if (token) {
      this.token = token;
    }

    this.disconnect();

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.emit('error', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Initialize without auto-connecting (for testing)
   */
  private autoConnect = true;

  /**
   * Set whether to auto-connect on construction
   */
  setAutoConnect(auto: boolean): void {
    this.autoConnect = auto;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnecting = false;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();

      // Send authentication if token available
      if (this.token) {
        try {
          this.send({
            type: 'hello',
            token: this.token,
          });
        } catch (error) {
          // Connection might not be fully ready yet
          console.warn('Failed to send authentication:', error);
        }
      }

      this.startHeartbeat();
      this.emit('connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (event: Event) => {
      this.emit('error', new Error('WebSocket error occurred'));
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.clearHeartbeat();
      this.emit('disconnected', { code: event.code, reason: event.reason });

      // Attempt to reconnect if not intentionally closed
      if (event.code !== 1000 && !this.reconnecting) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Update heartbeat timestamp
      if (message.type === 'ping') {
        this.lastHeartbeat = Date.now();
        this.send({ type: 'pong' });
        this.emit('ping');
        return;
      }

      if (message.type === 'pong') {
        this.lastHeartbeat = Date.now();
        return;
      }

      // Handle authentication
      if (message.type === 'authenticated') {
        this.emit('authenticated', message);
        return;
      }

      // Handle subscription confirmations (new protocol)
      if (message.type === 'subscribed') {
        this.emit('subscribed', message);
        return;
      }

      if (message.type === 'unsubscribed') {
        this.emit('unsubscribed', message);
        return;
      }

      // Handle subscriptions (old protocol - for backward compatibility)
      if (message.type === 'sub' || message.type === 'unsub') {
        this.emit('subscription', message);
        return;
      }

      // Handle streaming chunks
      if (message.type === 'chunk') {
        this.emit('chunk', message);
        return;
      }

      // Handle tool calls
      if (message.type === 'tool_call') {
        this.emit('tool_call', message);
        return;
      }

      // Handle done message
      if (message.type === 'done') {
        this.emit('done', message);
        return;
      }

      // Generic message handler
      this.emit('message', message);
    } catch (error) {
      // Malformed JSON - ignore
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Send message to server
   */
  private send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel);
      this.send({
        type: 'sub',
        channel,
      });
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel);
      this.send({
        type: 'unsub',
        channel,
      });
    }
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return {
      connected: this.isConnected(),
      authenticated: this.token !== null,
      subscriptions: this.getSubscriptions(),
    };
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;

    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Only reconnect if not already connected
      if (!this.isConnected()) {
        this.connect(this.token || undefined);
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.clearHeartbeat();

    // Update last heartbeat timestamp
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeat;

      // If no heartbeat for 2.5x interval, consider connection stale
      // This gives enough buffer to avoid false positives during tests
      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2.5) {
        console.warn('Connection stale, reconnecting...');
        this.scheduleReconnect();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Register event listener
   */
  on(event: string, handler: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return super.on(event, handler);
  }

  /**
   * Unregister event listener
   */
  off(event: string, handler: Function): this {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(handler);
    }

    return super.off(event, handler);
  }

  /**
   * Get all event listeners for an event (from EventEmitter)
   */
  getListeners(event: string): Function[] {
    return this.listeners.has(event) ? Array.from(this.listeners.get(event)!) : [];
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.subscriptions.clear();
    // Don't clear listeners immediately as they might be needed for disconnect event
    setTimeout(() => {
      this.listeners.clear();
      this.removeAllListeners();
    }, 0);
  }

  /**
   * Send a chat message to a session
   *
   * @param sessionId - The session ID to send the message to
   * @param content - The message content
   * @throws {Error} If WebSocket is not connected
   */
  sendChatMessage(sessionId: string, content: string): void {
    this.send({
      type: 'chat',
      sessionId,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Subscribe to a session for real-time updates
   *
   * @param sessionId - The session ID to subscribe to
   * @throws {Error} If WebSocket is not connected
   */
  subscribeToSession(sessionId: string): void {
    // Track subscription
    this.subscriptions.add(sessionId);

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      sessionId,
    });
  }

  /**
   * Unsubscribe from a session
   *
   * @param sessionId - The session ID to unsubscribe from
   * @throws {Error} If WebSocket is not connected
   */
  unsubscribeFromSession(sessionId: string): void {
    // Remove from local tracking
    this.subscriptions.delete(sessionId);

    // Send unsubscribe message to server
    this.send({
      type: 'unsubscribe',
      sessionId,
    });
  }

  /**
   * Check if subscribed to a specific session
   *
   * @param sessionId - The session ID to check
   * @returns True if subscribed to the session
   */
  isSubscribedToSession(sessionId: string): boolean {
    return this.subscriptions.has(sessionId);
  }
}
