/**
 * Project Test Fixtures
 *
 * Mock data and utilities for project and workspace testing
 */

import type { Workspace, Project, ProjectSummary } from '@agistack/shared';

export const mockWorkspaces: Workspace[] = [
  {
    id: 'workspace-1',
    userId: 'user-1',
    name: 'My Workspace',
    settings: { theme: 'dark' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'workspace-2',
    userId: 'user-1',
    name: 'Work Workspace',
    settings: { theme: 'light' },
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    workspaceId: 'workspace-1',
    name: 'My Project',
    path: '/path/to/project',
    description: 'A test project',
    metadata: { language: 'TypeScript' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'project-2',
    workspaceId: 'workspace-1',
    name: 'Another Project',
    path: '/path/to/another',
    description: 'Another test project',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

export const mockProjectSummaries: ProjectSummary[] = [
  {
    id: 'project-1',
    workspaceId: 'workspace-1',
    name: 'My Project',
    path: '/path/to/project',
    sessionCount: 5,
    lastSessionAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
  },
];

export function createMockWorkspace(overrides?: Partial<Workspace>): Workspace {
  return {
    id: 'workspace-test',
    userId: 'user-1',
    name: 'Test Workspace',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'project-test',
    workspaceId: 'workspace-test',
    name: 'Test Project',
    path: '/test/path',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProjectSummary(overrides?: Partial<ProjectSummary>): ProjectSummary {
  return {
    id: 'project-test',
    workspaceId: 'workspace-test',
    name: 'Test Project',
    path: '/test/path',
    sessionCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}
