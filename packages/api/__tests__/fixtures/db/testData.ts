/**
 * Database Test Fixtures
 *
 * Mock data and utilities for database testing
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestWorkspace {
  id: string;
  userId: string;
  name: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestProject {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const mockUsers: TestUser[] = [
  {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hash123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: 'hash456',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockWorkspaces: TestWorkspace[] = [
  {
    id: 'workspace-1',
    userId: 'user-1',
    name: 'My Workspace',
    settings: { theme: 'dark' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockProjects: TestProject[] = [
  {
    id: 'project-1',
    workspaceId: 'workspace-1',
    name: 'Test Project',
    path: '/path/to/project',
    description: 'A test project',
    metadata: { language: 'TypeScript' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export function createMockUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
    name: 'Test User',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockWorkspace(overrides?: Partial<TestWorkspace>): TestWorkspace {
  return {
    id: `workspace-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'user-1',
    name: 'Test Workspace',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<TestProject>): TestProject {
  return {
    id: `project-${Math.random().toString(36).substr(2, 9)}`,
    workspaceId: 'workspace-1',
    name: 'Test Project',
    path: '/test/path',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
