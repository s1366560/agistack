#!/bin/bash
set -e

echo "🛑 Stopping AgiStack Development Environment..."
echo ""

# Stop Docker services
echo "📦 Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped."
echo ""
echo "💡 To remove all data, run:"
echo "   docker-compose down -v"
