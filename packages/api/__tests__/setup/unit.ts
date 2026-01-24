/**
 * Unit Test Setup
 *
 * Global setup for unit tests
 */

import { vi } from 'vitest'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Mock external dependencies if needed
vi.mock('@ai-sdk/provider', () => ({
  createOpenAI: vi.fn(),
}))

// Global test timeout
vi.setConfig({ testTimeout: 10000 })
