/**
 * Test data fixtures
 * Provides reusable test data for unit and integration tests
 */

export const testWorkspace = {
  id: 'workspace-123',
  name: 'Test Workspace',
  slug: 'test-workspace',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const testProject = {
  id: 'project-123',
  workspaceId: 'workspace-123',
  name: 'Test Project',
  slug: 'test-project',
  path: '/tmp/test-project',
  description: 'A test project',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const testSession = {
  id: 'session-123',
  projectId: 'project-123',
  agentType: 'build' as const,
  title: 'Build a new feature',
  status: 'active' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const testMessage = {
  id: 'message-123',
  sessionId: 'session-123',
  role: 'user' as const,
  content: 'Build a new feature',
  createdAt: new Date().toISOString(),
}

export const createTestWorkspace = (overrides = {}) => ({
  ...testWorkspace,
  ...overrides,
})

export const createTestProject = (overrides = {}) => ({
  ...testProject,
  ...overrides,
})

export const createTestSession = (overrides = {}) => ({
  ...testSession,
  ...overrides,
})

export const createTestMessage = (overrides = {}) => ({
  ...testMessage,
  ...overrides,
})
