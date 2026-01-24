/**
 * MSW (Mock Service Worker) Handlers
 *
 * HTTP request mocks for API testing
 */

import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authHandlers = [
  // Login
  http.post(`${API_BASE}/api/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body?.email === 'test@example.com' && body?.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'mock-token',
        },
      });
    }
    return HttpResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Get current user
  http.get(`${API_BASE}/api/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }),

  // Logout
  http.post(`${API_BASE}/api/auth/logout`, () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];

export const workspaceHandlers = [
  // Get workspaces
  http.get(`${API_BASE}/api/workspaces`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'workspace-1',
          userId: 'user-1',
          name: 'My Workspace',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
  }),
];

export const projectHandlers = [
  // Get projects
  http.get(`${API_BASE}/api/projects`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'project-1',
          workspaceId: 'workspace-1',
          name: 'My Project',
          path: '/path/to/project',
          sessionCount: 0,
          createdAt: new Date(),
        },
      ],
    });
  }),

  // Get single project
  http.get(`${API_BASE}/api/projects/:id`, ({ params }) => {
    if (params.id === 'project-1') {
      return HttpResponse.json({
        success: true,
        data: {
          id: 'project-1',
          workspaceId: 'workspace-1',
          name: 'My Project',
          path: '/path/to/project',
          description: 'Test project',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    return HttpResponse.json(
      { success: false, error: 'Project not found' },
      { status: 404 }
    );
  }),
];

export const sessionHandlers = [
  // Get sessions
  http.get(`${API_BASE}/api/sessions`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),
];

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...workspaceHandlers,
  ...projectHandlers,
  ...sessionHandlers,
];
