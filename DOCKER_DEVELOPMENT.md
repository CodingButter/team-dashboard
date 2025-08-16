# Docker Development Environment

This document provides comprehensive guidance for setting up and using the Docker development environment for the Team Dashboard project.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ and pnpm 8+ (for local development)
- Git

### Single Command Startup
```bash
# Start the entire development environment
pnpm run dev:start

# Alternative: Start without interactive script
pnpm run dev:docker
```

### Stop Environment
```bash
# Stop all services
pnpm run dev:stop

# Alternative: Quick stop
pnpm run dev:docker:down
```

## Architecture Overview

The development environment consists of:

### Application Services
- **Dashboard** (Port 3000): Next.js frontend application
- **Agent Manager** (Ports 3001, 3003): WebSocket and HTTP API for agent management
- **MCP Manager** (Port 3004): Model Context Protocol server management
- **OpenAI Service** (Port 3005): OpenAI API integration service

### Infrastructure Services
- **PostgreSQL** (Port 5432): Primary application database
- **Redis** (Port 6379): Caching and pub/sub messaging
- **InfluxDB** (Port 8086): Time-series metrics storage

### Monitoring & Observability
- **Prometheus** (Port 9090): Metrics collection
- **Grafana** (Port 3010): Metrics visualization and dashboards
- **Loki** (Port 3100): Log aggregation

### Development Tools
- **Adminer** (Port 8080): Database administration
- **Redis Commander** (Port 8081): Redis data browser
- **Nginx** (Port 80): Reverse proxy for unified API access

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | - |
| Grafana | http://localhost:3010 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Adminer | http://localhost:8080 | postgres: dashboard_user/dashboard_pass |
| Redis Commander | http://localhost:8081 | admin/admin |
| Nginx Proxy | http://localhost | - |

## Development Features

### Hot Reload Support
- **Next.js**: Automatic reload on file changes
- **Node.js Services**: Live reload using tsx watch mode
- **Configuration**: Volume mounts for real-time updates

### Data Persistence
- Database data persists between restarts
- Redis AOF persistence enabled
- Grafana dashboards and configuration preserved

### Resource Management
- Optimized Docker layer caching
- Shared package volumes to reduce build time
- Memory limits configured for development use

## Configuration

### Environment Variables
The development environment uses these key environment variables:

```env
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
WATCHPACK_POLLING=true
WS_PORT=3001
AGENT_MANAGER_PORT=3003
MCP_MANAGER_PORT=3004
OPENAI_SERVICE_PORT=3005
MONITOR_PORT=8000
REDIS_URL=redis://redis:6379
POSTGRES_URL=postgresql://dashboard_user:dashboard_pass@postgres:5432/team_dashboard
```

### Network Configuration
All services communicate through the `dashboard-network` bridge network with subnet `172.20.0.0/16`.

### Volume Mounts
- Source code volumes for hot reload
- Database volumes for data persistence
- Configuration volumes for service setup

## Usage Instructions

### Starting Development
1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `pnpm run dev:start` for interactive startup
4. Access services through the URLs above

### Viewing Logs
```bash
# All services
pnpm run dev:docker:logs

# Specific service
docker-compose -f docker-compose.dev.yml logs -f dashboard

# Follow logs without pager
docker-compose -f docker-compose.dev.yml logs -f --no-color
```

### Restarting Services
```bash
# Restart specific service
docker-compose -f docker-compose.dev.yml restart dashboard

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up -d --build dashboard
```

### Database Access
```bash
# PostgreSQL via Adminer: http://localhost:8080
# Server: postgres
# Username: dashboard_user
# Password: dashboard_pass
# Database: team_dashboard

# Redis via Redis Commander: http://localhost:8081
# Or direct access:
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

## Performance Optimization

### Startup Time
- Target: < 30 seconds for full environment
- Optimizations: Parallel service startup, image layer caching
- Health checks ensure services are ready before dependent services start

### Resource Usage
- Development-optimized memory limits
- CPU limits prevent resource exhaustion
- Volume caching for fast rebuilds

### Network Performance
- Bridge network for optimal container communication
- Nginx reverse proxy for unified API access
- Health checks for service availability

## Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Check what's using a port
lsof -i :3000

# Kill process using port
kill -9 <PID>
```

**Database Connection Issues**
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.dev.yml exec postgres pg_isready

# Check Redis connectivity
docker-compose -f docker-compose.dev.yml exec redis redis-cli ping
```

**Build Issues**
```bash
# Clean build
docker-compose -f docker-compose.dev.yml down --rmi local
pnpm run dev:docker

# Force rebuild specific service
docker-compose -f docker-compose.dev.yml build --no-cache dashboard
```

**Volume Issues**
```bash
# Reset all data
docker-compose -f docker-compose.dev.yml down -v

# Remove orphaned volumes
docker volume prune
```

### Performance Issues
- Check Docker resource allocation in Docker Desktop
- Monitor container resource usage: `docker stats`
- Review service logs for performance bottlenecks

### Debugging Services
```bash
# Execute shell in container
docker-compose -f docker-compose.dev.yml exec dashboard sh

# Check service health
docker-compose -f docker-compose.dev.yml ps

# Inspect service configuration
docker-compose -f docker-compose.dev.yml config
```

## Advanced Usage

### Custom Configuration
Create a `docker-compose.override.yml` file for local modifications:

```yaml
version: '3.8'
services:
  dashboard:
    environment:
      - DEBUG=1
    ports:
      - "3001:3000"  # Custom port mapping
```

### Production Mode
For production-like testing:
```bash
# Use production docker-compose
docker-compose up -d

# Or build production images
docker-compose -f docker-compose.dev.yml -f docker-compose.prod.yml up -d
```

### Monitoring Setup
- Grafana dashboards auto-provisioned
- Prometheus metrics collection configured
- Custom metrics endpoints available at `/metrics`

## Security Considerations

### Development Only
- Default passwords are for development only
- Database credentials are not production-ready
- No TLS/SSL configuration in development mode

### Network Security
- Services isolated in Docker network
- No external access except through exposed ports
- Firewall rules should restrict access in shared environments

## File Structure

```
├── docker-compose.dev.yml          # Development environment definition
├── config/                         # Service configurations
│   ├── redis/redis.conf            # Redis configuration
│   ├── postgres/init.sql           # Database initialization
│   ├── prometheus/prometheus.yml   # Prometheus configuration
│   ├── grafana/                    # Grafana dashboards and datasources
│   ├── loki/loki-config.yml       # Loki configuration
│   └── nginx/dev.conf              # Nginx reverse proxy
├── scripts/
│   ├── dev-start.sh                # Interactive startup script
│   └── dev-stop.sh                 # Interactive stop script
└── apps/*/Dockerfile.dev           # Service Dockerfiles
```

## Contributing

When modifying the Docker setup:
1. Test changes thoroughly
2. Update this documentation
3. Ensure backward compatibility
4. Validate startup time remains < 30 seconds
5. Check resource usage is reasonable for development