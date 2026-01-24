/**
 * Mock Server Setup
 *
 * MSW server configuration for testing
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const mockServer = setupServer(...handlers);

// Setup before all tests
export function setupMockServer() {
  mockServer.listen({
    onUnhandledRequest: 'error',
  });
}

// Reset handlers after each test
export function resetMockServer() {
  mockServer.resetHandlers();
}

// Close server after all tests
export function closeMockServer() {
  mockServer.close();
}
