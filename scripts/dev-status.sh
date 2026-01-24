#!/bin/bash

echo "🔍 AgiStack Development Environment Status"
echo "=========================================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check Docker Compose services
echo "📦 Docker Services:"
docker-compose ps
echo ""

# Check PostgreSQL
echo "🐘 PostgreSQL:"
if docker exec agistack-postgres pg_isready -U agistack > /dev/null 2>&1; then
    echo "   ✅ Running and accepting connections"

    # Get database size
    DB_SIZE=$(docker exec agistack-postgres psql -U agistack -d agistack -t -c "SELECT pg_size_pretty(pg_database_size('agistack'));" 2>/dev/null | xargs)
    echo "   📊 Database size: $DB_SIZE"

    # Count tables
    TABLES=$(docker exec agistack-postgres psql -U agistack -d agistack -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    echo "   📋 Tables: $TABLES"
else
    echo "   ❌ Not ready"
fi
echo ""

# Check Redis
echo "🔴 Redis:"
if docker exec agistack-redis redis-cli -a redis_dev ping > /dev/null 2>&1; then
    echo "   ✅ Running and accepting connections"

    # Get Redis info
    REDIS_VERSION=$(docker exec agistack-redis redis-cli -a redis_dev INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
    echo "   🔖 Version: $REDIS_VERSION"

    # Get memory usage
    MEMORY=$(docker exec agistack-redis redis-cli -a redis_dev INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    echo "   💾 Memory: $MEMORY"
else
    echo "   ❌ Not ready"
fi
echo ""

# Check API server
echo "🌐 API Server:"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ Running on http://localhost:3001"

    # Get health status
    HEALTH=$(curl -s http://localhost:3001/api/health)
    echo "   📊 $HEALTH"
else
    echo "   ❌ Not responding on http://localhost:3001"
fi
echo ""

# Check Web server
echo "🎨 Web Server:"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Running on http://localhost:3000"
else
    echo "   ❌ Not responding on http://localhost:3000"
fi
echo ""

echo "=========================================="
echo "💡 Management commands:"
echo "   Start:  ./scripts/dev-start.sh"
echo "   Stop:   ./scripts/dev-stop.sh"
echo "   Logs:   docker-compose logs -f"
echo "   Reset:  docker-compose down -v"
