#!/bin/bash

# Team Dashboard Development Environment Startup Script
set -e

echo "🚀 Starting Team Dashboard Development Environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans

# Pull latest images
echo "📥 Pulling latest base images..."
docker-compose -f docker-compose.dev.yml pull redis postgres influxdb prometheus grafana adminer redis-commander loki nginx

# Start infrastructure services first
echo "🏗️  Starting infrastructure services..."
docker-compose -f docker-compose.dev.yml up -d redis postgres influxdb prometheus grafana loki

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
timeout 60 bash -c 'until docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U dashboard_user -d team_dashboard; do sleep 2; done'
timeout 60 bash -c 'until docker-compose -f docker-compose.dev.yml exec redis redis-cli ping | grep PONG; do sleep 2; done'

# Start application services
echo "🔧 Building and starting application services..."
docker-compose -f docker-compose.dev.yml up -d --build

# Start development tools
echo "🛠️  Starting development tools..."
docker-compose -f docker-compose.dev.yml up -d adminer redis-commander nginx

# Show status
echo "📊 Service Status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🔗 Available Services:"
echo "   📱 Dashboard:         http://localhost:3000"
echo "   🔧 Agent Manager:     http://localhost:3003"
echo "   📡 MCP Manager:       http://localhost:3004"
echo "   🤖 OpenAI Service:    http://localhost:3005"
echo "   📊 Grafana:           http://localhost:3010 (admin/admin)"
echo "   📈 Prometheus:        http://localhost:9090"
echo "   🗄️  Adminer:           http://localhost:8080"
echo "   🔴 Redis Commander:   http://localhost:8081"
echo "   📋 Nginx (Proxy):     http://localhost"
echo ""
echo "🔍 Useful Commands:"
echo "   📜 View logs:         docker-compose -f docker-compose.dev.yml logs -f"
echo "   🛑 Stop environment:  docker-compose -f docker-compose.dev.yml down"
echo "   🔄 Restart service:   docker-compose -f docker-compose.dev.yml restart <service>"
echo ""

# Follow logs
read -p "🤔 Do you want to follow the logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.dev.yml logs -f
fi