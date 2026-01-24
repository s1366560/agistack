# API Client Service

Typed HTTP client for frontend-backend communication with comprehensive error handling, retry logic, and authentication support.

## Features

- ✅ Typed API client with TypeScript
- ✅ Request/Response interceptors
- ✅ Authentication token injection
- ✅ Automatic retry logic with exponential backoff
- ✅ Timeout handling
- ✅ Comprehensive error handling
- ✅ Typed endpoint functions
- ✅ 94.61% test coverage

## Usage

### Basic Setup

```typescript
import { createApiClient, createApiEndpoints } from '@/services/api';

// Create client instance
const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  retries: 3,
  getToken: () => localStorage.getItem('authToken'),
});

// Create typed endpoints
const api = createApiEndpoints(apiClient);
```

### Authentication

```typescript
// Login
const result = await api.login({ email, password });
if (result.success && result.data) {
  localStorage.setItem('authToken', result.data.token);
  localStorage.setItem('user', JSON.stringify(result.data.user));
}

// Get current user
const me = await api.me();

// Logout
await api.logout();
```

### Workspaces

```typescript
// Get all workspaces
const { data: workspaces } = await api.getWorkspaces();

// Get single workspace
const { data: workspace } = await api.getWorkspace('workspace-1');

// Create workspace
const { data: newWorkspace } = await api.createWorkspace({
  userId: 'user-1',
  name: 'My Workspace',
});

// Update workspace
const { data: updated } = await api.updateWorkspace('workspace-1', {
  name: 'Updated Name',
});

// Delete workspace
await api.deleteWorkspace('workspace-1');
```

### Projects

```typescript
// Get all projects
const { data: projects } = await api.getProjects();

// Get projects by workspace
const { data: workspaceProjects } = await api.getProjects('workspace-1');

// Get single project
const { data: project } = await api.getProject('project-1');

// Create project
const { data: newProject } = await api.createProject({
  workspaceId: 'workspace-1',
  name: 'My Project',
  path: '/path/to/project',
});

// Update project
const { data: updated } = await api.updateProject('project-1', {
  name: 'Updated Name',
});

// Delete project
await api.deleteProject('project-1');
```

### Sessions

```typescript
// Get sessions by project
const { data: sessions } = await api.getSessions('project-1');

// Get single session
const { data: session } = await api.getSession('session-1');

// Create session
const { data: newSession } = await api.createSession({
  projectId: 'project-1',
  agentType: 'claude-opus-4-5-20251101',
  title: 'My Session',
});

// Update session
const { data: updated } = await api.updateSession('session-1', {
  title: 'Updated Title',
});

// Delete session
await api.deleteSession('session-1');
```

### Advanced Usage

#### Request Interceptors

```typescript
apiClient.addRequestInterceptor(async ({ url, options }) => {
  // Modify request before sending
  options.headers = {
    ...options.headers,
    'X-Custom-Header': 'value',
  };
  return { url, options };
});
```

#### Response Interceptors

```typescript
apiClient.addResponseInterceptor(async (response) => {
  // Modify response before processing
  if (response.status === 401) {
    // Handle unauthorized
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  return response;
});
```

#### Error Handler

```typescript
apiClient.setErrorHandler(async (error) => {
  console.error('API Error:', error);
  // Show toast notification
  toast.error(error.message);
});
```

#### Custom Timeout

```typescript
const { data } = await api.getProjects(
  undefined,
  { timeout: 30000 } // 30 second timeout
);
```

## API Response Format

All API methods return an `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
```

## Error Handling

```typescript
const result = await api.getWorkspaces();

if (result.success) {
  // Access data
  const workspaces = result.data;
} else {
  // Handle error
  console.error(result.error);
}
```

## Retry Logic

The client automatically retries failed requests with exponential backoff:
- Initial retry after 1 second
- Second retry after 2 seconds
- Third retry after 4 seconds
- Maximum 3 retries by default

Timeout errors are not retried.

## Authentication

Set up automatic token injection:

```typescript
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  getToken: () => {
    // Return token from storage
    return localStorage.getItem('authToken');
  },
});
```

The client will automatically add the `Authorization: Bearer <token>` header to all requests.

## Testing

All tests passing (49 tests):
- Unit tests for ApiClient (28 tests)
- Unit tests for ApiEndpoints (21 tests)
- 94.61% code coverage

Run tests:
```bash
npm test src/services/api
```

## File Structure

```
src/services/api/
├── client.ts       # ApiClient class with fetch wrapper
├── endpoints.ts    # Typed API endpoint functions
├── types.ts        # TypeScript type definitions
├── index.ts        # Main exports
├── client.test.tsx # ApiClient tests
├── endpoints.test.tsx # ApiEndpoints tests
└── README.md       # This file
```
