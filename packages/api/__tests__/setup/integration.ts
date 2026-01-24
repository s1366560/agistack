/**
 * Integration Test Setup
 *
 * Global setup for integration tests
 */

import { vi } from 'vitest'

// Mock environment variables for integration tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Setup integration test mocks
vi.mock('@ai-sdk/provider', () => ({
  createOpenAI: vi.fn(),
}))

// Clean up after each integration test
afterEach(() => {
  vi.clearAllMocks()
})
