/**
 * API Client Types
 *
 * Shared types for API client implementation
 */

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * API error details
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options
 */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number>;
  retries?: number;
  timeout?: number;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  getToken?: () => string | null | undefined;
}

/**
 * Request interceptor function
 */
export type RequestInterceptor = (config: {
  url: string;
  options: RequestOptions;
}) => { url: string; options: RequestOptions } | Promise<{ url: string; options: RequestOptions }>;

/**
 * Response interceptor function
 */
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

/**
 * Error handler function
 */
export type ErrorHandler = (error: ApiError) => void | Promise<void>;
