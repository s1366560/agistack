#!/bin/bash
set -e

echo "🚀 Starting AgiStack Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Docker services
echo "📦 Starting Docker services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec agistack-postgres pg_isready -U agistack > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL is ready"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker exec agistack-redis redis-cli -a redis_dev ping > /dev/null 2>&1; do
    sleep 1
done
echo "✅ Redis is ready"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please review and update if needed."
fi

# Run migrations if needed
echo ""
echo "📊 Running database migrations..."
cd packages/api
bun run db:migrate
cd ../..

echo ""
echo "✨ Development environment is ready!"
echo ""
echo "🌐 Available services:"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:3001"
echo "   pgAdmin:   http://localhost:5050 (optional)"
echo ""
echo "📝 To start development servers, run:"
echo "   bun dev"
