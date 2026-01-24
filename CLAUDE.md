# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agistack** is a web application providing an AI-powered code collaboration platform (web version of opencode). Built as a monorepo using pnpm workspaces with Turborepo for task orchestration.

### Tech Stack

- **Runtime**: Bun (API), Node.js (tooling)
- **Backend**: Hono framework, Drizzle ORM, PostgreSQL
- **Frontend**: SolidJS, Vite, TailwindCSS
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Build**: Turborepo with pnpm workspaces
- **AI**: Vercel AI SDK with Anthropic, Google, OpenAI providers

---

## Monorepo Structure

```
agistack/
├── packages/
│   ├── api/          # Hono backend API
│   ├── web/          # SolidJS frontend application
│   └── shared/       # Shared TypeScript types and utilities
└── turbo.json        # Turborepo configuration
```

### Package Overview

**packages/api** (`@agistack/api`)
- REST API built with Hono
- Database: PostgreSQL with Drizzle ORM
- Authentication: JWT-based auth with bcrypt
- AI Integration: Multi-provider support (Anthropic, Google, OpenAI)
- Repository pattern for data access
- Security middleware (helmet, cors)

**packages/web** (`@agistack/web`)
- SolidJS SPA with file-based routing
- API client service with interceptors and retry logic
- Component-based architecture with layout system
- TailwindCSS for styling
- Testing with SolidJS Testing Library

**packages/shared**
- Shared TypeScript interfaces and types
- Cross-package utilities
- Domain models and DTOs

---

## Common Commands

### Development

```bash
# Start all services in watch mode
bun dev

# Or use turbo directly
turbo run dev

# Start specific package
cd packages/api && bun run dev
cd packages/web && npm run dev
```

### Building

```bash
# Build all packages
bun run build

# Build specific package
cd packages/api && bun run build
cd packages/web && npm run build
```

### Type Checking

```bash
# Type check all packages
bun run typecheck

# Type check specific package
cd packages/api && bun run typecheck
cd packages/web && npm run typecheck
```

### Testing

```bash
# Run all tests (all packages)
bun run test:run

# Watch mode for all tests
bun run test

# API package tests
cd packages/api
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:all          # All tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Web package tests
cd packages/web
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests (Playwright)
npm run test:e2e:ui       # E2E tests with UI
npm run test:all          # All tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Run specific test file
npm test -- [test-file-pattern]
```

### Database Operations

```bash
# Generate migrations from schema changes
cd packages/api
bun run db:generate

# Run migrations
bun run db:migrate

# Rollback last migration
bun run db:rollback

# Seed database with test data
bun run db:seed

# Open Drizzle Studio (database GUI)
bun run db:studio
```

---

## Architecture Patterns

### Repository Pattern (API)

All database operations use the repository pattern with a base class:

```typescript
// Base repository with common CRUD operations
abstract class BaseRepository<T> {
  abstract findById(id: string): Promise<T | null>
  abstract findAll(filters?: FindAllOptions): Promise<T[]>
  abstract create(data: CreateDto<T>): Promise<T>
  abstract update(id: string, data: UpdateDto<T>): Promise<T>
  abstract delete(id: string): Promise<void>
}

// Example: UserRepository
class UserRepository extends BaseRepository<User> {
  // User-specific operations
  async findByEmail(email: string): Promise<User | null>
  async verifyPassword(email: string, password: string): Promise<boolean>
}
```

**Location**: `packages/api/src/repositories/`

### API Client Service (Web)

Frontend uses a centralized API client with interceptors:

```typescript
// Singleton instance with configuration
const apiClient = new ApiClient({
  baseURL: '/api',
  timeout: 10000,
  retries: 3,
  getToken: () => localStorage.getItem('auth_token')
})

// Typed endpoint functions
export const api = {
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (data) => apiClient.post('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me')
  },
  workspaces: {
    list: () => apiClient.get('/workspaces'),
    create: (data) => apiClient.post('/workspaces', data)
  }
  // ... more endpoints
}
```

**Features**:
- Automatic retry with exponential backoff
- Request/response interceptors for auth injection
- Centralized error handling
- Type-safe responses

**Location**: `packages/web/src/services/api/`

### Test Structure

Both packages use a **hybrid test structure**:

1. **Co-located Unit Tests**: Test files next to source code
   - Pattern: `src/**/*.test.{ts,tsx}`
   - Example: `src/routes/health.test.ts` next to `src/routes/health.ts`

2. **Centralized Integration/E2E Tests**: In `__tests__/` directory
   ```
   __tests__/
   ├── integration/     # Integration tests
   ├── e2e/            # End-to-end tests (web package only)
   ├── fixtures/       # Test data and mocks
   │   ├── api/        # API request/response fixtures
   │   ├── db/         # Database test data
   │   └── mocks/      # MSW handlers, server mocks
   ├── helpers/        # Test utilities
   │   ├── database.ts # Database helpers
   │   ├── api.ts      # API test helpers
   │   └── test-utils.ts # General utilities
   └── setup/          # Global test configuration
       ├── unit.ts     # Unit test setup
       ├── integration.ts # Integration test setup
       └── e2e.ts      # E2E test setup
   ```

**Test Configuration**:
- `vitest.config.ts` - Test runner configuration
- Coverage threshold: 80% minimum
- Environment: Test database with in-memory SQLite for API

---

## Development Workflow

### Test-Driven Development (TDD)

This project follows strict TDD methodology:

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass test
3. **REFACTOR**: Improve code while keeping tests green
4. **Verify**: Ensure 80%+ test coverage

**Key Principles**:
- Never write code without tests first
- All tests must pass before committing
- Coverage below 80% is a blocker

### Code Style

**Immutability**:
- NEVER mutate objects or arrays
- Always create new objects with spread operator
- Use `const` by default, `let` only when necessary

```typescript
// WRONG
function updateUser(user, name) {
  user.name = name
  return user
}

// CORRECT
function updateUser(user, name) {
  return { ...user, name }
}
```

**File Organization**:
- Many small files over few large files
- 200-400 lines typical, 800 max per file
- High cohesion, low coupling
- Organize by feature/domain, not by type

**Error Handling**:
- Always use try/catch for async operations
- Validate user input with Zod schemas
- Parameterized queries only (never concatenate SQL)
- Never leak sensitive data in error messages

### Security Checklist

Before committing code:
- [ ] No hardcoded secrets (use environment variables)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized output)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on public endpoints
- [ ] Error messages don't leak sensitive info

---

## Key Patterns

### API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agistack

# Authentication
JWT_SECRET=your-secret-key

# AI Providers (optional)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-openai-xxx
GOOGLE_API_KEY=xxx

# Application
NODE_ENV=development
API_PORT=3001
```

### Database Schema

Uses Drizzle ORM with PostgreSQL:
- **Users**: Authentication and profile
- **Workspaces**: Team workspaces
- **Projects**: Individual projects within workspaces
- **Sessions**: Chat sessions with AI
- **Messages**: Messages within sessions

**Location**: `packages/api/src/db/schema.ts`

---

## Troubleshooting

### Build Errors

1. **TypeScript errors**: Run `bun run typecheck` to see all errors
2. **Build fails**: Check dependencies with `pnpm install`
3. **Port conflicts**: API defaults to 3001, web to 3000

### Test Failures

1. **Unit tests fail**: Check mocks in `__tests__/fixtures/mocks/`
2. **Integration tests fail**: Verify test database is running
3. **Coverage below 80%**: Write more tests for uncovered paths
4. **Timeout errors**: Increase timeout in `vitest.config.ts` or test

### Database Issues

1. **Migration conflicts**: Run `bun run db:migrate` again
2. **Schema out of sync**: Regenerate with `bun run db:generate`
3. **Seed data missing**: Run `bun run db:seed`

---

## Available Skills

- `/tdd` - Test-driven development workflow
- `/plan` - Create implementation plan
- `/code-review` - Review code quality
- `/build-fix` - Fix build errors
- `/refactor-clean` - Remove dead code

## Git Workflow

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- **No Direct Commits to main**: Always work on feature branches
- **PR Required**: All changes require pull request review
- **Tests Must Pass**: All tests must pass before merge

---

## File Organization Examples

### API Package

```
packages/api/src/
├── db/
│   ├── schema.ts          # Database schema definitions
│   ├── index.ts           # Database connection
│   ├── migrate.ts         # Migration runner
│   └── seed.ts            # Database seeding
├── repositories/
│   ├── base.ts            # Base repository class
│   ├── user.repository.ts
│   ├── workspace.repository.ts
│   └── project.repository.ts
├── routes/
│   ├── health.ts          # Health check endpoint
│   ├── auth.ts            # Authentication endpoints
│   └── projects.ts        # Project CRUD endpoints
├── middleware/
│   └── security.ts        # Security middleware
└── index.ts               # App entry point
```

### Web Package

```
packages/web/src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── ui/                # Reusable UI components
├── routes/
│   ├── index.tsx          # Home page
│   ├── projects/
│   │   ├── index.tsx      # Projects list
│   │   └── [id].tsx       # Project detail
│   └── 404.tsx            # Not found page
├── services/
│   └── api/
│       ├── client.ts      # API client class
│       └── endpoints.ts   # Typed endpoints
├── hooks/                 # Custom SolidJS hooks
├── lib/                   # Utility functions
├── types/                 # TypeScript definitions
└── app.tsx                # App root component
```

---

## Getting Started

1. **Install dependencies**: `pnpm install`
2. **Setup database**: `cd packages/api && bun run db:migrate && bun run db:seed`
3. **Start development**: `bun dev`
4. **Run tests**: `bun run test:run`
5. **Type check**: `bun run typecheck`

---

## Resources

- **Hono Docs**: https://hono.dev
- **SolidJS Docs**: https://solidjs.com
- **Drizzle ORM**: https://orm.drizzle.team
- **Vitest**: https://vitest.dev
- **Playwright**: https://playwright.dev
- **Turborepo**: https://turbo.build/repo
