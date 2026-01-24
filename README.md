# AgiStack

Web-based AI programming assistant powered by OpenCode.

## Project Overview

AgiStack is a modern web application that provides AI-powered programming assistance with support for multiple AI providers (Anthropic, OpenAI, Google, Groq) and a sophisticated multi-agent system.

## Architecture

This is a **monorepo** built with Bun workspaces and Turbo for efficient development and builds.

```
agistack/
├── packages/
│   ├── api/          # Hono backend (TypeScript)
│   ├── web/          # SolidJS frontend
│   ├── shared/       # Shared types and utilities
│   └── config/       # Shared configuration
├── vendor/
│   └── opencode/     # Reference implementation (submodule)
└── docs/             # Documentation
```

## Tech Stack

### Frontend
- **SolidJS 1.9+** - Reactive UI framework
- **Vite 7+** - Build tool and dev server
- **TailwindCSS 4+** - Utility-first CSS
- **@kobalte/core** - Accessible UI primitives

### Backend
- **Bun 1.3+** - JavaScript runtime
- **Hono 4+** - Lightweight web framework
- **Vercel AI SDK 5+** - AI abstraction layer
- **Drizzle ORM** - Type-safe database access
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.3.5 or later
- [Docker](https://www.docker.com/) & Docker Compose (for local development services)
- OR PostgreSQL 14+ and Redis 7+ (if not using Docker)

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repo-url>
cd agistack
```

2. Install dependencies:
```bash
bun install
```

3. Start development dependencies with Docker Compose:
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Optional: Start with management tools (pgAdmin, Redis Commander)
docker-compose --profile tools up -d
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration if needed
```

5. Initialize the database:
```bash
cd packages/api
bun run db:generate
bun run db:migrate
bun run db:seed
```

6. Start development servers:
```bash
bun dev
```

7. Access the application:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Health: http://localhost:3001/api/health
- pgAdmin (optional): http://localhost:5051
- Redis Commander (optional): http://localhost:8082

### Option 2: Using Native Services

If you prefer to use native PostgreSQL and Redis installations:

1. Clone the repository:
```bash
git clone <repo-url>
cd agistack
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
cd packages/api
bun run db:generate
bun run db:migrate
bun run db:seed
```

5. Start development servers:
```bash
bun dev
```

6. Access the application:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Health: http://localhost:3001/api/health

## Docker Compose Commands

### Starting Services

```bash
# Start all core services (PostgreSQL, Redis)
docker-compose up -d

# Start with management tools (pgAdmin, Redis Commander)
docker-compose --profile tools up -d

# Stop all services
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Service URLs

When using Docker Compose, services are available at:

- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6380
- **pgAdmin** (optional): http://localhost:5051
  - Default credentials: admin@agistack.local / admin
- **Redis Commander** (optional): http://localhost:8082

### Quick Scripts

Use the provided scripts for easier management:

```bash
# Start all services and run migrations
./scripts/dev-start.sh

# Stop all services
./scripts/dev-stop.sh

# Check status of all services
./scripts/dev-status.sh
```

See [docs/DOCKER.md](./docs/DOCKER.md) for detailed Docker documentation.

## Development

### Available Scripts

- `bun dev` - Start all development servers
- `bun run build` - Build all packages
- `bun run typecheck` - Type check all packages
- `bun test` - Run all tests
- `bun run test:coverage` - Run tests with coverage
- `bun run clean` - Clean all node_modules

### Database Management

- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Apply database migrations
- `bun run db:studio` - Open Drizzle Studio (database GUI)

### Workspace Commands

Run commands in specific packages:

```bash
# Run dev in api package only
bun run --filter './packages/api' dev

# Run dev in web package only
bun run --filter './packages/web' dev

# Run tests in shared package only
bun run --filter './packages/shared' test
```

## Project Structure

### `/packages/api`
Backend API built with Hono.

- `src/index.ts` - Server entry point
- `src/routes/` - API route handlers
- `src/middleware/` - Auth, CORS, error handling
- `src/db/` - Database schema and migrations
- `src/services/` - Business logic

### `/packages/web`
Frontend application built with SolidJS.

- `src/main.tsx` - Application entry
- `src/App.tsx` - Root component
- `src/routes/` - File-based routing
- `src/components/` - Reusable UI components
- `src/contexts/` - State management
- `src/services/` - API client and utilities

### `/packages/shared`
Shared code between frontend and backend.

- `src/types/` - TypeScript type definitions
- `src/constants/` - Shared constants
- `src/utils/` - Shared utilities

## Testing

We follow Test-Driven Development (TDD) principles.

### Test Structure

```
packages/
├── api/
│   ├── src/
│   │   └── routes/
│   │       ├── projects.ts
│   │       └── projects.test.ts  # Unit + Integration tests
│   └── e2e/                     # E2E tests for API
└── web/
    ├── src/
    │   └── components/
    │       └── Button.test.tsx   # Component tests
    └── e2e/                     # Playwright E2E tests
        └── app.spec.ts
```

### Running Tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# Coverage
bun run test:coverage
```

### Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: 70%+ coverage
- E2E tests: Critical user flows 100%

## Environment Variables

See `.env.example` in the root directory for all required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `JWT_SECRET` - Secret for JWT signing
- `ANTHROPIC_API_KEY` - Anthropic API key
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_API_KEY` - Google API key
- `GROQ_API_KEY` - Groq API key

## Deployment

Target deployment platform: **Cloudflare Workers**

- API: Cloudflare Workers
- Frontend: Cloudflare Pages
- Database: PostgreSQL (managed service)
- Storage: Cloudflare R2

See [docs/OPENCODE_WEB_APP_PLAN.md](./docs/OPENCODE_WEB_APP_PLAN.md) for detailed deployment strategy.

## Development Roadmap

See [docs/OPENCODE_WEB_APP_PLAN.md](./docs/OPENCODE_WEB_APP_PLAN.md) for the complete 16-week development plan.

### Current Phase: Phase 1 - Infrastructure Setup

- [x] Monorepo structure
- [ ] TypeScript configuration
- [ ] Build system setup
- [ ] Database schema
- [ ] Basic API server
- [ ] Basic frontend app

## Contributing

This project follows TDD principles:

1. Write tests first
2. Run tests (they should fail)
3. Implement code to make tests pass
4. Run tests again (they should pass)
5. Refactor
6. Verify coverage (80%+)

## License

MIT

## Resources

- [SolidJS Docs](https://www.solidjs.com/)
- [Hono Docs](https://hono.dev/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Bun Docs](https://bun.sh/)
