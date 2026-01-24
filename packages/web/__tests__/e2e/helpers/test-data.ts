/**
 * Test data factories for E2E tests
 * Generates realistic test data for browser automation
 */

export const testUsers = {
  valid: {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    name: 'Test User',
  },
  invalid: {
    email: 'invalid-email',
    password: '123', // Too short
  },
}

export const testProjects = {
  minimal: {
    name: 'Test Project',
    path: '/tmp/test-project',
    description: '',
  },
  full: {
    name: 'Full Test Project',
    path: '/tmp/full-test-project',
    description: 'A complete test project with all fields',
  },
  invalid: {
    name: '', // Empty name
    path: '/tmp/test',
    description: 'Test',
  },
}

export const testSessions = {
  build: {
    agentType: 'build',
    title: 'Build a new feature',
  },
  refactor: {
    agentType: 'refactor',
    title: 'Refactor old code',
  },
  fix: {
    agentType: 'fix',
    title: 'Fix a bug',
  },
}

export const testMessages = {
  user: {
    role: 'user',
    content: 'Build a login form with validation',
  },
  assistant: {
    role: 'assistant',
    content: 'I will help you build a login form',
  },
}
