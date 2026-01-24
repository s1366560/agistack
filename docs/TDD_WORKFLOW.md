# Test-Driven Development Workflow

## Overview

This project follows strict TDD principles with 80% minimum coverage across all packages. Tests are written FIRST, then implementation follows.

## Testing Stack

- **Unit/Integration Tests**: Vitest (solid-js + node environments)
- **E2E Tests**: Playwright (multi-browser: Chromium, Firefox, WebKit)
- **Coverage Provider**: v8 (built into Vitest)
- **Test Helpers**: Custom utilities for API, components, and database

## Project Structure

```
packages/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── db/
│   └── tests/
│       ├── helpers/
│       │   ├── test-db.ts       # Database mocking
│       │   └── test-api.ts      # API testing utilities
│       └── fixtures/
│           └── test-data.ts     # Reusable test data
├── web/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── tests/
│       ├── unit/                # Component tests
│       ├── e2e/                 # Playwright tests
│       │   ├── helpers/
│       │   │   ├── page-objects.ts  # Page Object Models
│       │   │   └── test-data.ts     # E2E test data
│       │   ├── auth.spec.ts
│       │   ├── projects.spec.ts
│       │   └── sessions.spec.ts
│       └── helpers/
│           └── test-components.tsx  # Component test utilities
└── shared/
    └── tests/
```

## TDD Workflow Steps

### 1. Write User Journey

Define what you're building from the user's perspective:

```
As a developer, I want to create a new project,
so that I can manage my code workspace.
```

### 2. Write Test Cases (RED)

Create comprehensive test cases BEFORE writing implementation:

```typescript
// packages/api/tests/routes/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { testApiRequest, expectSuccess, expectError } from '../helpers/test-api'
import { createTestProject } from '../fixtures/test-data'

describe('POST /api/projects', () => {
  it('should create a new project with valid data', async () => {
    const projectData = createTestProject()

    const response = await testApiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    })

    expectSuccess(response)

    const data = await response.json()
    expect(data).toHaveProperty('id')
    expect(data.name).toBe(projectData.name)
  })

  it('should reject project with empty name', async () => {
    const invalidProject = createTestProject({ name: '' })

    const response = await testApiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(invalidProject),
    })

    expectError(response, 400)
  })

  it('should validate project path format', async () => {
    const invalidProject = createTestProject({ path: 'invalid-path' })

    const response = await testApiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(invalidProject),
    })

    expectError(response, 400)
  })
})
```

### 3. Run Tests (Should Fail)

```bash
# Run specific test file
pnpm --filter @agistack/api test src/routes/projects.test.ts

# Run all tests
pnpm test

# Watch mode during development
pnpm --filter @agistack/api test --watch
```

### 4. Implement Minimal Code (GREEN)

Write just enough code to make tests pass:

```typescript
// packages/api/src/routes/projects.ts
import { z } from 'zod'

const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  path: z.string().regex(/^\/.*/, 'Path must be absolute'),
  description: z.string().optional(),
})

export async function createProject(req: Request) {
  const body = await req.json()

  // Validate input
  const validated = createProjectSchema.parse(body)

  // Create project
  const project = await db.projects.create(validated)

  return Response.json(project, { status: 201 })
}
```

### 5. Run Tests Again (Should Pass)

```bash
pnpm test
```

### 6. Refactor (IMPROVE)

Clean up code while keeping tests green:

```typescript
// Extract validation logic
// Extract database operations
// Improve error messages
// Add documentation
```

### 7. Verify Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open packages/api/coverage/index.html
```

**Minimum requirements:**
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## Testing Patterns

### API Route Testing (Hono)

```typescript
import { describe, it, expect } from 'vitest'
import { testApiRequest, expectSuccess } from '../helpers/test-api'

describe('GET /api/projects/:id', () => {
  it('should return project by id', async () => {
    const response = await testApiRequest('/api/projects/123')
    expectSuccess(response)

    const data = await response.json()
    expect(data.id).toBe('123')
  })

  it('should return 404 for non-existent project', async () => {
    const response = await testApiRequest('/api/projects/non-existent')
    expect(response.status).toBe(404)
  })
})
```

### Component Testing (SolidJS)

```typescript
import { render, screen, fireEvent } from '@solidjs/testing-library'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'
import { clickButton } from '../helpers/test-components'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(() => <Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(() => <Button onClick={handleClick}>Click</Button>)

    await clickButton('Click')

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(() => <Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies custom classes', () => {
    render(() => <Button class="custom-class">Click</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
```

### E2E Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test'
import { ProjectsPage } from './helpers/page-objects'

test('user can create a new project', async ({ page }) => {
  const projectsPage = new ProjectsPage(page)

  await projectsPage.goto()
  await projectsPage.createProject(
    'Test Project',
    '/tmp/test-project',
    'A test project'
  )

  await projectsPage.expectProjectVisible('Test Project')
})
```

## Mocking External Dependencies

### Database Mocking

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupTestDb } from '../helpers/test-db'

describe('Project Repository', () => {
  const db = setupTestDb()

  beforeEach(() => {
    db.addData('projects', [
      { id: '1', name: 'Test Project' },
    ])
  })

  it('should find project by id', () => {
    const project = db.find('projects', (p) => p.id === '1')
    expect(project?.name).toBe('Test Project')
  })
})
```

### API Service Mocking

```typescript
import { vi } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  createProject: vi.fn(() => Promise.resolve({
    id: '123',
    name: 'Test Project',
  })),
}))
```

## Test Data Management

### Using Test Fixtures

```typescript
import { createTestProject, createTestSession } from '../fixtures/test-data'

// Create with defaults
const project = createTestProject()

// Create with overrides
const customProject = createTestProject({
  name: 'Custom Project',
  path: '/custom/path',
})
```

### Page Object Models

```typescript
import { ProjectsPage } from './helpers/page-objects'

const projectsPage = new ProjectsPage(page)

// Reusable actions
await projectsPage.goto()
await projectsPage.createProject(name, path, description)

// Reusable assertions
await projectsPage.expectProjectVisible(name)
await projectsPage.expectProjectCount(3)
```

## Running Tests

### All Tests

```bash
# Run all tests across all packages
pnpm test

# Run all tests with coverage
pnpm test:coverage

# Run all tests once (not in watch mode)
pnpm test:run
```

### API Package Tests

```bash
# Run API tests
pnpm --filter @agistack/api test

# Run specific test file
pnpm --filter @agistack/api test src/routes/projects.test.ts

# Watch mode
pnpm --filter @agistack/api test --watch
```

### Web Package Tests

```bash
# Run web unit tests
pnpm --filter @agistack/web test

# Run E2E tests
pnpm --filter @agistack/web test:e2e

# Run E2E tests in headed mode
pnpm --filter @agistack/web test:e2e --headed
```

## Coverage Thresholds

All packages enforce 80% minimum coverage:

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

To view detailed coverage:

```bash
# Generate coverage
pnpm test:coverage

# Open HTML report
open packages/api/coverage/index.html
open packages/web/coverage/index.html
```

## Pre-Commit Hooks

Tests run automatically before commits:

```bash
# .git/hooks/pre-commit
pnpm test:run && pnpm typecheck
```

## CI/CD Integration

GitHub Actions runs tests on every PR:

```yaml
- name: Run tests
  run: pnpm test:run

- name: Generate coverage
  run: pnpm test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Best Practices

### DO:

- Write tests FIRST (TDD)
- Test user-visible behavior, not implementation
- Use descriptive test names
- One assertion per test (when possible)
- Mock external dependencies
- Test edge cases (null, undefined, empty, large)
- Test error paths (not just happy paths)
- Keep tests fast (< 50ms each)
- Clean up after tests
- Use test fixtures and page objects

### DON'T:

- Test internal state
- Use brittle selectors (CSS classes)
- Make tests depend on each other
- Skip or disable tests
- Write console.log in tests
- Test third-party libraries
- Over-mock (test real behavior)

## Common Testing Mistakes

### ❌ Testing Implementation Details

```typescript
// WRONG
expect(component.state.count).toBe(5)
```

### ✅ Testing User Behavior

```typescript
// CORRECT
expect(screen.getByText('Count: 5')).toBeInTheDocument()
```

### ❌ Brittle Selectors

```typescript
// WRONG - Breaks easily
await page.click('.css-class-xyz')
```

### ✅ Semantic Selectors

```typescript
// CORRECT - Resilient to changes
await page.click('button:has-text("Submit")')
await page.click('[data-testid="submit-button"]')
```

### ❌ No Test Isolation

```typescript
// WRONG - Tests depend on each other
test('creates user', () => { /* ... */ })
test('updates same user', () => { /* depends on previous */ })
```

### ✅ Independent Tests

```typescript
// CORRECT - Each test sets up its own data
test('creates user', () => {
  const user = createTestUser()
  // Test logic
})

test('updates user', () => {
  const user = createTestUser()
  // Update logic
})
```

## Troubleshooting

### Tests Timing Out

```bash
# Increase timeout
test('slow test', async () => {
  // ... test code
}, 10000) // 10 second timeout
```

### Flaky E2E Tests

```typescript
// Add explicit waits
await page.waitForSelector('[data-testid="result"]')
await page.waitForURL(/\/projects\/.+/)

// Use Playwright's auto-waiting
await expect(page.getByText('Success')).toBeVisible()
```

### Coverage Not Meeting Thresholds

```bash
# View uncovered lines
pnpm test:coverage

# Check HTML report for specific files
open packages/coverage/index.html
```

## Success Metrics

Your code is ready when:

- ✅ All tests pass (green)
- ✅ 80%+ coverage achieved
- ✅ No skipped or disabled tests
- ✅ Fast test execution (< 30s for unit tests)
- ✅ E2E tests cover critical user flows
- ✅ Tests catch bugs before production

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [SolidJS Testing Library](https://solid-testing-library.vercel.app/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.
