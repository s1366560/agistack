/**
 * API Test Helpers
 *
 * Utility functions for testing Hono routes
 */

import type { Hono } from 'hono';

export interface TestRequestOptions {
  method: string;
  path: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Create a mock request for testing Hono routes
 */
export function createTestRequest(
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>,
  headers?: Record<string, string>
): Request {
  const url = new URL(path, 'http://localhost');

  // Add query parameters
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  // Create request init
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  // Add body for POST/PUT/PATCH requests
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    init.body = JSON.stringify(body);
  }

  return new Request(url.toString(), init);
}

/**
 * Parse response JSON safely
 */
export async function parseResponseJson<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text as any;
  }
}
