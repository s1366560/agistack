/**
 * API Client
 *
 * Typed HTTP client for frontend-backend communication
 */

import type {
  ApiResponse,
  ApiError,
  RequestOptions,
  ApiClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorHandler,
} from './types';

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retries: number;
  private headers: Record<string, string>;
  private getToken?: () => string | null | undefined;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorHandler?: ErrorHandler;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
    this.headers = config.headers || {};
    this.getToken = config.getToken;
  }

  /**
   * Add request interceptor
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Set error handler
   */
  public setErrorHandler(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Build full URL
   */
  private buildUrl(url: string, params?: Record<string, string | number>): string {
    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const fullUrl = new URL(url);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          fullUrl.searchParams.set(key, String(value));
        });
      }
      return fullUrl.toString();
    }

    // Handle relative URLs
    let fullUrl = url.startsWith('/') ? url : `/${url}`;
    fullUrl = `${this.baseURL}${fullUrl}`;

    if (params) {
      const urlObj = new URL(fullUrl);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value));
      });
      fullUrl = urlObj.toString();
    }

    return fullUrl;
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.headers };

    // Add auth token if available
    if (this.getToken) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add custom headers
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${this.timeout}ms`)), this.timeout);
    });
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    options: RequestOptions,
    attempt: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      // Apply request interceptors
      let interceptedRequest = { url, options };
      for (const interceptor of this.requestInterceptors) {
        interceptedRequest = await interceptor(interceptedRequest);
      }

      // Build fetch options
      const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: this.buildHeaders(options.headers),
      };

      if (options.body && options.method !== 'GET' && options.method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(options.body);
      }

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(interceptedRequest.url, fetchOptions),
        this.createTimeoutPromise(),
      ]) as Response;

      // Apply response interceptors
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }

      // Handle successful responses
      if (processedResponse.ok) {
        // Handle 204 No Content
        if (processedResponse.status === 204) {
          return { success: true, data: undefined as T };
        }

        try {
          const data = await processedResponse.json();
          return { success: true, data };
        } catch (jsonError) {
          return {
            success: false,
            error: `Invalid JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`
          };
        }
      }

      // Handle error responses
      let errorMessage = 'Request failed';
      try {
        const errorData = await processedResponse.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }

      const apiError: ApiError = {
        message: errorMessage,
        status: processedResponse.status,
      };

      // Call error handler
      if (this.errorHandler) {
        await this.errorHandler(apiError);
      }

      return { success: false, error: errorMessage };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if timeout error
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('timed out');

      // Retry logic for network errors (but not timeouts)
      if (!isTimeout && attempt < this.retries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return this.executeRequest<T>(url, options, attempt + 1);
      }

      const apiError: ApiError = {
        message: errorMessage,
      };

      // Call error handler
      if (this.errorHandler) {
        await this.errorHandler(apiError);
      }

      return { success: false, error: apiError.message };
    }
  }

  /**
   * Make HTTP request
   */
  public async request<T>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url, options.params);
    return this.executeRequest<T>(fullUrl, options);
  }

  /**
   * GET request
   */
  public async get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  public async put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  public async patch<T>(url: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  public async delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

/**
 * Create singleton API client instance
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient({
  baseURL: '/api',
  timeout: 10000,
  retries: 3,
});
