# Port Configuration Guide

This document defines the port assignments for all services in the Team Dashboard monorepo.

## Service Port Assignments

| Service | Port | Environment Variable | Description |
|---------|------|---------------------|-------------|
| Next.js Dashboard | 3000 | `PORT` | Main frontend application |
| WebSocket Server | 3001 | `WS_PORT` | Real-time WebSocket communication |
| Documentation Site | 3002 | `DOCS_PORT` | Documentation website |
| Agent Manager API | 3003 | `AGENT_MANAGER_PORT` | HTTP API for agent management |
| System Monitor | 8000 | `MONITOR_PORT` | Python FastAPI monitoring service |
| Prometheus | 9090 | - | Metrics collection |
| Grafana | 3010 | - | Metrics visualization (changed from 3001 to avoid conflict) |

## Database Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Application database |
| Redis | 6379 | Caching and pub/sub |
| Neo4j | 7687 | Graph database |
| InfluxDB | 8086 | Time-series metrics |

## Test Ports

| Test Suite | Port | Description |
|------------|------|-------------|
| WebSocket Tests | 3099 | Isolated port for integration tests |

## Important Notes

1. **Never use port 3000 for WebSocket**: Port 3000 is reserved for the Next.js dashboard
2. **WebSocket server MUST use port 3001**: This is hardcoded in client connections
3. **Test ports should be > 3090**: To avoid conflicts with development services
4. **Check `.env` file**: Ensure your `.env` file has the correct port assignments

## Environment Setup

Create a `.env` file in the root directory with:

```env
# Frontend
PORT=3000

# WebSocket
WS_PORT=3001

# Agent Manager
AGENT_MANAGER_PORT=3003

# Documentation
DOCS_PORT=3002

# System Monitor
MONITOR_PORT=8000
```

## Troubleshooting Port Conflicts

If you encounter port conflicts:

1. Check running processes: `lsof -i :PORT_NUMBER`
2. Kill conflicting process: `kill -9 PID`
3. Verify environment variables: `echo $WS_PORT`
4. Restart services with correct ports

## Docker Compose Ports

The `docker-compose.yml` file maps the following ports:
- PostgreSQL: 5432:5432
- Redis: 6379:6379
- Neo4j: 7687:7687, 7474:7474
- InfluxDB: 8086:8086
- Prometheus: 9090:9090
- Grafana: 3010:3000 (internal 3000 mapped to external 3010)