# Docker Development Guide

This guide explains how to use Docker Compose for local development with AgiStack.

## Overview

Docker Compose provides an easy way to run all required development dependencies:
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and session storage
- **pgAdmin** - Database management UI (optional)
- **Redis Commander** - Redis management UI (optional)

## Prerequisites

- Docker Desktop 4.0+ or Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Start Core Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 2. Start with Management Tools (Optional)

```bash
# Start all services including pgAdmin and Redis Commander
docker-compose --profile tools up -d
```

### 3. Initialize Application

```bash
# Copy environment variables
cp .env.example .env

# Generate and run database migrations
cd packages/api
bun run db:generate
bun run db:migrate
bun run db:seed
```

### 4. Start Development Servers

```bash
# From project root
bun dev
```

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| API | http://localhost:3001 | - |
| API Health | http://localhost:3001/api/health | - |
| PostgreSQL | localhost:5433 | agistack / agistack_dev |
| Redis | localhost:6380 | password: redis_dev |
| pgAdmin | http://localhost:5051 | admin@agistack.local / admin |
| Redis Commander | http://localhost:8082 | - |

## Common Commands

### Managing Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
docker-compose logs -f redis

# Remove all volumes (WARNING: deletes all data!)
docker-compose down -v
```

### Database Management

```bash
# Access PostgreSQL via psql
docker exec -it agistack-postgres psql -U agistack -d agistack

# Access PostgreSQL via docker-compose
docker-compose exec postgres psql -U agistack -d agistack

# Run migrations
cd packages/api
bun run db:migrate

# Rollback migrations
bun run db:rollback

# Open Drizzle Studio
bun run db:studio
```

### Redis Management

```bash
# Access Redis via redis-cli
docker exec -it agistack-redis redis-cli -a redis_dev

# Test Redis connection
docker exec agistack-redis redis-cli -a redis_dev ping
# Should return: PONG
```

## Troubleshooting

### Port Conflicts

If you see port conflict errors:

```bash
# Check what's using the port
lsof -i :5433  # PostgreSQL
lsof -i :6380  # Redis
lsof -i :5051  # pgAdmin
lsof -i :8082  # Redis Commander

# Change ports in docker-compose.yml if needed
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec agistack-postgres pg_isready -U agistack
```

### Reset Everything

If something is completely broken:

```bash
# Stop and remove everything
docker-compose down -v

# Remove Docker images
docker rmi agistack-postgres agistack-redis agistack-pgadmin

# Start fresh
docker-compose up -d
```

### Data Persistence

Data is stored in Docker volumes:
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis persistence
- `pgadmin_data` - pgAdmin settings

To backup data:

```bash
# Backup PostgreSQL
docker exec agistack-postgres pg_dump -U agistack agistack > backup.sql

# Restore PostgreSQL
cat backup.sql | docker exec -i agistack-postgres psql -U agistack -d agistack
```

## Development Workflow

### Typical Development Session

```bash
# 1. Start services
docker-compose up -d

# 2. Run migrations (if schema changed)
cd packages/api
bun run db:migrate

# 3. Seed database (if needed)
bun run db:seed

# 4. Start dev servers
bun dev

# 5. Develop...
# Make changes to code

# 6. When done, stop services
docker-compose down
```

### Running Tests

```bash
# Unit/Integration tests (use in-memory database)
bun run test:unit

# E2E tests (require running services)
docker-compose up -d
bun run test:e2e
```

## Environment Variables

Key variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://agistack:agistack_dev@localhost:5433/agistack
POSTGRES_USER=agistack
POSTGRES_PASSWORD=agistack_dev
POSTGRES_DB=agistack

# Redis
REDIS_URL=redis://:redis_dev@localhost:6380
REDIS_PASSWORD=redis_dev
```

## Production Considerations

This Docker Compose setup is for **development only**. For production:

1. Use managed database services (RDS, Cloud SQL, etc.)
2. Enable SSL/TLS for database connections
3. Use strong passwords (change defaults!)
4. Enable database backups
5. Monitor resource usage
6. Use proper secrets management

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [pgAdmin Docker Image](https://hub.docker.com/r/dpage/pgadmin4)
