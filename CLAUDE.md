# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Team Management Dashboard - A comprehensive web-based dashboard for managing Claude Code instances with sequential workflow coordination, real-time system monitoring, and enhanced team coordination capabilities. This is a monorepo using pnpm workspaces with microservices architecture.

## Development Commands

### Setup and Dependencies
- `pnpm install` - Install all dependencies across the monorepo
- `docker-compose up -d` - Start infrastructure services (Neo4j, Redis, PostgreSQL, Prometheus, Grafana, InfluxDB)
- `docker-compose down` - Stop infrastructure services
- `docker-compose logs -f` - View infrastructure logs

### Development
- `pnpm dev` - Start all services in development mode (parallel)
- `pnpm start` - Start all services in production mode (parallel)

### Code Quality
- `pnpm lint` - Run ESLint across all workspaces
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run test suite using Vitest

### Building
- `pnpm build` - Build all packages and applications recursively

## Architecture Overview

### Monorepo Structure
- `apps/dashboard/` - Next.js 14 frontend application with TypeScript and Tailwind CSS
- `apps/docs/` - Documentation site
- `services/agent-manager/` - Node.js service for spawning and managing Claude Code instances
- `services/system-monitor/` - Python monitoring service using psutil and FastAPI
- `packages/ui/` - Shared UI components using shadcn/ui
- `packages/types/` - TypeScript type definitions
- `packages/utils/` - Shared utilities

### Technology Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Socket.io-client, xterm.js, vis.js
- **Backend**: Hybrid Node.js (Fastify) + Python (FastAPI) microservices
- **Real-time**: WebSockets for bidirectional agent communication  
- **Databases**: Redis (caching/pubsub), PostgreSQL (app data), InfluxDB (metrics)
- **Monitoring**: Prometheus + Grafana stack

### Key Features
1. **Agent Management**: Spawn/control Claude Code instances with process isolation  
2. **Interactive Frames**: Terminal emulation with xterm.js for direct agent communication
3. **System Monitoring**: Real-time CPU/memory/GPU/network metrics with alerting
4. **Sequential Workflow**: Coordinated task handoffs between agents with memento MCP memory
5. **Team Coordination**: GitHub integration, task management, and communication tools

## Important Configuration

### Path Aliases (tsconfig.json)
- `@/*` - packages/*
- `@ui/*` - packages/ui/*  
- `@types/*` - packages/types/*
- `@utils/*` - packages/utils/*

### Required Environment
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- Python 3.11+ (for monitoring services)

### Infrastructure Services
The project requires multiple database services to be running:
- Redis: Port 6379 - for caching and pub/sub messaging
- PostgreSQL: Port 5432 - for application data  
- Prometheus: Port 9090 - for metrics collection
- Grafana: Port 3001 - for metrics visualization
- InfluxDB: Port 8086 - for time-series metrics

Always start infrastructure with `docker-compose up -d` before development.

## Development Workflow

1. Start infrastructure services first
2. Install dependencies with pnpm
3. Use sequential workflow coordination - agents work one at a time, not in parallel
4. Each service should be independently testable
5. Maintain strict TypeScript typing
6. Follow existing patterns for WebSocket communication and process management
7. Use existing monitoring and alerting patterns for new features
8. Agents use memento MCP for individual memory - no shared memory visualization needed

## Security Considerations

- Agent processes run in isolated Docker containers with resource limits
- JWT-based authentication with role-based access control
- All inter-service communication uses secure protocols
- Command injection prevention through input sanitization
- Audit logging for all agent operations
- You do not code. you are just the orchestrator, you only delegate