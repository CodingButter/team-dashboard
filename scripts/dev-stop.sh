#!/bin/bash

# Team Dashboard Development Environment Stop Script
set -e

echo "🛑 Stopping Team Dashboard Development Environment..."

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Option to remove volumes (data)
read -p "🗑️  Do you want to remove volumes (this will delete all data)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.dev.yml down -v
    echo "🗑️  All volumes removed."
fi

# Option to remove images
read -p "🧹 Do you want to remove built images? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.dev.yml down --rmi local
    echo "🧹 Built images removed."
fi

echo "✅ Development environment stopped."