/**
 * Integration Test Setup
 *
 * Global setup for integration tests
 */

import { vi, afterEach, beforeAll, afterAll } from 'vitest';
import { getTestDatabase, closeTestDatabase, cleanTestDatabase } from '../helpers/integration';

// Mock environment variables for integration tests
process.env.DATABASE_URL = 'file:./test.db'
process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Setup integration test mocks
vi.mock('@ai-sdk/provider', () => ({
  createOpenAI: vi.fn(),
}))

// Global test database instance
let testDb: ReturnType<typeof getTestDatabase> | null = null;

// Get test database for use in tests
beforeAll(() => {
  testDb = getTestDatabase();
});

// Clean up after each integration test
afterEach(async () => {
  vi.clearAllMocks();
  if (testDb) {
    await cleanTestDatabase(testDb);
  }
});

// Close database after all tests
afterAll(() => {
  closeTestDatabase();
});
