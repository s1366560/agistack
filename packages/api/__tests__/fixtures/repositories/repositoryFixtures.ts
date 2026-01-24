/**
 * Repository Test Fixtures
 *
 * Mock data and utilities for repository testing
 */

import { createMockUser, createMockWorkspace, createMockProject } from '../db/testData';

export const repositoryFixtures = {
  user: createMockUser(),
  workspace: createMockWorkspace(),
  project: createMockProject(),
  users: [createMockUser(), createMockUser({ email: 'user2@example.com' })],
  workspaces: [
    createMockWorkspace(),
    createMockWorkspace({ name: 'Second Workspace' }),
  ],
  projects: [
    createMockProject(),
    createMockProject({ name: 'Second Project' }),
  ],
};

export const repositoryTestData = {
  validUser: {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
  },
  validWorkspace: {
    userId: 'user-1',
    name: 'My Workspace',
  },
  validProject: {
    workspaceId: 'workspace-1',
    name: 'My Project',
    path: '/path/to/project',
  },
};

export function createRepositoryMock<T>(methods?: Partial<T>): T {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    ...methods,
  } as unknown as T;
}
