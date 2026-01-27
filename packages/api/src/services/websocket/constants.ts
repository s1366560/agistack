/**
 * WebSocket Chat Constants
 *
 * Centralized constants for WebSocket chat functionality
 */

/**
 * WebSocket close codes
 */
export const WS_CLOSE_CODES = {
  /** Missing authentication token */
  MISSING_TOKEN: 4001,

  /** Invalid authentication token */
  INVALID_TOKEN: 4003,

  /** Normal closure */
  NORMAL_CLOSURE: 1000,

  /** Going away */
  GOING_AWAY: 1001,
} as const;

/**
 * Error codes for WebSocket error messages
 */
export const ERROR_CODES = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  STREAM_INTERRUPTED: 'STREAM_INTERRUPTED',
  UNKNOWN_MESSAGE_TYPE: 'UNKNOWN_MESSAGE_TYPE',
} as const;

/**
 * Error messages for WebSocket errors
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.SESSION_NOT_FOUND]: 'Session not found',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests, please try again later',
  [ERROR_CODES.VALIDATION_ERROR]: 'Message validation failed',
  [ERROR_CODES.PARSE_ERROR]: 'Failed to parse message as JSON',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
  [ERROR_CODES.STREAM_INTERRUPTED]: 'Stream interrupted unexpectedly',
  [ERROR_CODES.UNKNOWN_MESSAGE_TYPE]: 'Unknown message type',
} as const;

/**
 * Message validation constraints
 */
export const VALIDATION = {
  CONTENT_MIN_LENGTH: 1,
  CONTENT_MAX_LENGTH: 10000,
  SESSION_ID_MIN_LENGTH: 1,
  SESSION_ID_MAX_LENGTH: 100,
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CLIENT_TIMEOUT: 60000, // 60 seconds
  RECONNECT_INTERVAL: 3000, // 3 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;

/**
 * Message type constants
 */
export const MESSAGE_TYPES = {
  // Client message types
  CHAT: 'chat',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  HELLO: 'hello',

  // Server message types
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  CHUNK: 'chunk',
  DONE: 'done',
  TOOL_CALL: 'tool_call',
  ERROR: 'error',
  PONG: 'pong',
} as const;
