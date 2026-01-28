/**
 * Custom Error Types for Chat API
 *
 * Provides specific error types for different failure scenarios
 */

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Session not found error (404)
 */
export class SessionNotFoundError extends ApiError {
  constructor(sessionId: string) {
    super(
      `Session not found: ${sessionId}`,
      404,
      `/api/sessions/${sessionId}`
    );
    this.name = 'SessionNotFoundError';
  }
}

/**
 * Unauthorized access error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access. Please login.') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden.') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded. Please try again later.') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Network error
 */
export class NetworkError extends ApiError {
  constructor(message = 'Network request failed.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ApiError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Stream interruption error
 */
export class StreamInterruptedError extends ApiError {
  constructor(message = 'Stream was interrupted', public partialData?: unknown) {
    super(message);
    this.name = 'StreamInterruptedError';
  }
}

/**
 * Invalid input error
 */
export class InvalidInputError extends ApiError {
  constructor(field: string, value: string) {
    super(`Invalid ${field}: ${value}`);
    this.name = 'InvalidInputError';
  }
}

/**
 * Check if error is a specific type
 */
export function isSessionNotFoundError(error: unknown): error is SessionNotFoundError {
  return error instanceof SessionNotFoundError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isStreamInterruptedError(error: unknown): error is StreamInterruptedError {
  return error instanceof StreamInterruptedError;
}
