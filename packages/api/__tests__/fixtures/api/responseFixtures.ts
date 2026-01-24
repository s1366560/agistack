/**
 * API Response Fixtures
 *
 * Mock API response data for testing
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export const mockAuthResponses = {
  success: {
    success: true,
    data: {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: 'mock-jwt-token',
    },
  } as ApiResponse<{
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
    token: string;
  }>,
  invalidCredentials: {
    success: false,
    error: 'Invalid email or password',
  } as ApiResponse<never>,
  unauthorized: {
    success: false,
    error: 'Unauthorized',
  } as ApiResponse<never>,
};

export const mockProjectResponses = {
  created: {
    success: true,
    data: {
      id: 'project-1',
      workspaceId: 'workspace-1',
      name: 'My Project',
      path: '/path/to/project',
      description: 'A test project',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as ApiResponse<{
    id: string;
    workspaceId: string;
    name: string;
    path: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }>,
  notFound: {
    success: false,
    error: 'Project not found',
  } as ApiResponse<never>,
};

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(message: string): ApiResponse<never> {
  return {
    success: false,
    error: message,
  };
}
