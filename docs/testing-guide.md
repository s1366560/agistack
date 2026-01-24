# Testing Guide

## Overview

This guide explains the testing structure and best practices for the AgiStack web application.

## Test Structure

```
packages/web/
├── src/                          # Source code (with co-located unit tests)
│   ├── components/**/*.test.tsx  # Component unit tests
│   ├── services/**/*.test.ts     # Service unit tests
│   ├── hooks/**/*.test.ts        # Hook unit tests
│   └── routes/**/*.test.tsx      # Route unit tests
│
└── __tests__/                    # Dedicated test directory
    ├── integration/              # Integration tests
    ├── e2e/                      # E2E tests (Playwright)
    ├── fixtures/                 # Test data and mocks
    │   ├── api/                  # API fixtures (auth, projects, sessions)
    │   ├── components/           # Component fixtures
    │   └── mocks/                # MSW handlers and server setup
    ├── helpers/                  # Test utilities
    │   ├── render.tsx            # Custom render wrapper
    │   ├── test-utils.ts         # Testing utilities
    │   └── mockData.ts           # Mock data generators
    └── setup/                    # Test configuration
        ├── unit.ts               # Unit test setup
        ├── integration.ts        # Integration test setup
        └── e2e.ts                # E2E test setup
```

## Test Types

### Unit Tests

**Purpose**: Test individual functions, components, or modules in isolation.

**Location**: Co-located with source code (e.g., `Component.tsx` → `Component.test.tsx`)

**When to Use**:
- Testing component rendering and props
- Testing utility functions
- Testing service methods
- Testing custom hooks

**Example**:
```typescript
// src/components/layout/Sidebar.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from 'solid-js/web';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('should render workspace list', () => {
    const { container } = render(() => <Sidebar workspaces={mockWorkspaces} />);
    expect(container.querySelector('[data-testid="workspace-list"]')).toBeDefined();
  });
});
```

### Integration Tests

**Purpose**: Test multiple modules working together.

**Location**: `__tests__/integration/`

**When to Use**:
- Testing API client with real (or heavily mocked) backend
- Testing component interactions with context
- Testing multi-component workflows
- Testing route navigation

**Example**:
```typescript
// __tests__/integration/api/auth.integration.test.ts
import { describe, it, expect } from 'vitest';
import { createApiClient } from '@/services/api';
import { mockAuthResponse } from '__tests__/fixtures';

describe('Auth Integration', () => {
  it('should login user with valid credentials', async () => {
    const client = createApiClient({
      baseURL: 'http://localhost:3000',
    });

    const result = await client.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    expect(result.data?.user.email).toBe('test@example.com');
  });
});
```

### E2E Tests

**Purpose**: Test complete user workflows in a browser.

**Location**: `__tests__/e2e/`

**When to Use**:
- Testing critical user flows (login, create project)
- Testing multi-page workflows
- Testing real browser interactions
- Testing with real backend

**Example**:
```typescript
// __tests__/e2e/auth/login.e2e.test.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Welcome, Test User')).toBeVisible();
});
```

## Test Naming Conventions

### File Naming
- Unit tests: `[FileName].test.{ts,tsx}`
- Integration tests: `[Feature].integration.test.{ts,tsx}`
- E2E tests: `[UserFlow].e2e.test.{ts,tsx}`

### Test Description Naming
- Use `should` or `should not` for behavior tests
- Use descriptive names that explain what is being tested
- Include the expected outcome

**Good Examples**:
```typescript
it('should render user avatar when provided', () => {})
it('should not redirect if user is authenticated', () => {})
it('should return error when token is invalid', () => {})
```

## Using Test Fixtures

### Import Fixtures

```typescript
import {
  mockUsers,
  mockTokens,
  createMockUser,
} from '__tests__/fixtures/api/authFixtures';
```

### Use Mock Data

```typescript
it('should display user profile', () => {
  const user = mockUsers.testUser;
  render(() => <UserProfile user={user} />);
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

### Create Dynamic Mocks

```typescript
it('should handle custom user data', () => {
  const customUser = createMockUser({
    name: 'Custom Name',
    email: 'custom@example.com',
  });
  // Test with customUser
});
```

## Using Test Helpers

### Custom Render with Router

```typescript
import { renderWithRouter } from '__tests__/helpers/render';

it('should navigate to project page', () => {
  const { container } = renderWithRouter(
    () => <ProjectLink projectId="123" />,
    { route: '/projects' }
  );
  // Test navigation
});
```

### Test Utilities

```typescript
import { waitFor, generateId, suppressConsoleErrors } from '__tests__/helpers';

it('should wait for async operation', async () => {
  await waitFor(100); // Wait 100ms
});

it('should generate unique ID', () => {
  const id = generateId('user');
  expect(id).toMatch(/^user-/);
});
```

## NPM Scripts

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run E2E Tests Only
```bash
npm run test:e2e
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run All Test Suites
```bash
npm run test:all
```

## TDD Workflow

Follow Test-Driven Development:

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make it pass
3. **REFACTOR**: Improve code while keeping tests green

```bash
# Use the /tdd command to invoke TDD workflow
/tdd Implement user profile component
```

## Coverage Requirements

- **80% minimum** coverage across all metrics
- **100% required** for critical code (auth, payments, security)

Check coverage:
```bash
npm run test:coverage
```

## Best Practices

### DO:
- ✅ Write tests before implementation (TDD)
- ✅ Test behavior, not implementation details
- ✅ Use descriptive test names
- ✅ Use fixtures for consistent mock data
- ✅ Keep tests small and focused
- ✅ Test error cases and edge cases
- ✅ Mock external dependencies
- ✅ Clean up after tests (afterEach)

### DON'T:
- ❌ Test implementation details
- ❌ Write complex tests
- ❌ Skip running tests after changes
- ❌ Ignore failing tests
- ❌ Test third-party libraries
- ❌ Over-mock (prefer real implementations)
- ❌ Share mutable state between tests

## Common Patterns

### Testing Async Operations

```typescript
it('should load data asynchronously', async () => {
  const { result } = renderHook(() => useUserData());
  await waitFor(() => expect(result.current.data).toBeDefined());
});
```

### Testing Error Handling

```typescript
it('should handle API errors', async () => {
  vi.spyOn(api, 'getUser').mockRejectedValue(new Error('Network error'));
  const { result } = renderHook(() => useUserData());
  await waitFor(() => expect(result.current.error).toBe('Network error'));
});
```

### Testing User Interactions

```typescript
it('should call onSubmit when form is submitted', async () => {
  const handleSubmit = vi.fn();
  render(() => <LoginForm onSubmit={handleSubmit} />);

  await fireEvent.submit(screen.getByRole('form'));
  expect(handleSubmit).toHaveBeenCalledOnce();
});
```

## Troubleshooting

### Tests Timing Out
- Increase timeout: `it('slow test', { timeout: 30000 }, async () => {})`
- Check for infinite loops or unresolved promises
- Verify mock setup

### Mocks Not Working
- Ensure mocks are declared before tests
- Check mock implementation matches real API
- Use `vi.clearAllMocks()` in `afterEach`

### Fixtures Not Found
- Verify import paths use `__tests__/fixtures` prefix
- Check fixture files are in correct directories
- Run TypeScript type check: `npm run typecheck`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [SolidJS Testing](https://www.solidjs.com/docs/latest#testing-solid)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
