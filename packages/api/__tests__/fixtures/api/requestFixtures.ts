/**
 * API Request Fixtures
 *
 * Mock API request data for testing
 */

export interface MockAuthRequest {
  email: string;
  password: string;
}

export interface MockCreateProjectRequest {
  workspaceId: string;
  name: string;
  path: string;
  description?: string;
}

export const mockAuthRequests = {
  valid: {
    email: 'test@example.com',
    password: 'password123',
  } as MockAuthRequest,
  invalid: {
    email: 'test@example.com',
    password: 'wrongpassword',
  } as MockAuthRequest,
  nonexistent: {
    email: 'nonexistent@example.com',
    password: 'password123',
  } as MockAuthRequest,
};

export const mockProjectRequests = {
  valid: {
    workspaceId: 'workspace-1',
    name: 'My Project',
    path: '/path/to/project',
    description: 'A test project',
  } as MockCreateProjectRequest,
  missingFields: {
    workspaceId: 'workspace-1',
    name: 'My Project',
    // Missing required fields
  } as Partial<MockCreateProjectRequest>,
};

export function createMockAuthRequest(overrides?: Partial<MockAuthRequest>): MockAuthRequest {
  return {
    email: 'test@example.com',
    password: 'password123',
    ...overrides,
  };
}

export function createMockProjectRequest(overrides?: Partial<MockCreateProjectRequest>): MockCreateProjectRequest {
  return {
    workspaceId: 'workspace-1',
    name: 'Test Project',
    path: '/test/path',
    ...overrides,
  };
}
