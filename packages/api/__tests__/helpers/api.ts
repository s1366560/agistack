/**
 * API Test Helpers
 *
 * Utilities for API endpoint testing
 */

import { describe, beforeAll, afterAll } from 'vitest';

let testServer: any;

/**
 * Setup API test server
 */
export function setupAPITest() {
  beforeAll(async () => {
    // Start test server
    // testServer = await startTestServer();
  });

  afterAll(async () => {
    // Stop test server
    // if (testServer) {
    //   await testServer.close();
    // }
  });
}

/**
 * Create authenticated request headers
 */
export function createAuthHeaders(token: string = 'mock-token') {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Mock authenticated user
 */
export function mockAuthenticatedUser(userId: string = 'user-1') {
  vi.mock('../src/middleware/auth', () => ({
    authenticateUser: vi.fn().mockResolvedValue({
      id: userId,
      email: 'test@example.com',
    }),
  }));
}

/**
 * Create mock request object
 */
export function createMockRequest(
  body: any = {},
  headers: Record<string, string> = {}
) {
  return {
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    query: {},
    params: {},
  };
}

/**
 * Create mock response object
 */
export function createMockResponse() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();

  return {
    status,
    json,
    send,
    statusCode: 200,
  };
}
