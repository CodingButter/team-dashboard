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

## CRITICAL: Fresh Worktree Lifecycle Management

**MANDATORY**: EVERY AGENT SPAWN CREATES A BRAND NEW WORKTREE

### Fresh Worktree Strategy
1. **FRESH WORKTREES ONLY**: Every agent spawn creates a completely new worktree
2. **NO REUSE**: Never reuse existing worktrees under any circumstances  
3. **AUTOMATIC CREATION**: OpenAI agent manager automatically creates fresh worktrees
4. **SYSTEMATIC CLEANUP**: Project Manager removes worktrees after PR merge
5. **TIMESTAMP UNIQUENESS**: Every worktree has unique timestamp ensuring no conflicts

### Worktree Lifecycle
```
Agent Spawn → Fresh Worktree Created → Development → PR Created → PR Merged → Worktree Cleaned Up
```

### Branch Management Rules

#### NEVER COMMIT TO MAIN OR DEVELOPMENT BRANCHES
1. **NEVER** commit directly to `main` branch - this is FORBIDDEN
2. **NEVER** commit directly to `development` branch - this is FORBIDDEN  
3. **ALWAYS** create a feature branch for your work in your fresh worktree
4. **ONLY** the Lead Developer merges PRs into development
5. **ONLY** the Project Manager approves merges to main

#### Naming Conventions
- **Worktree Path**: `/home/codingbutter/GitHub/team-dashboard-worktrees/agent-{name}-{timestamp}`
- **Branch Name**: `feature/{agent-name}-{timestamp}`
- **Example**: `/home/codingbutter/GitHub/team-dashboard-worktrees/agent-frontend-expert-1755320488/`
- **Branch Example**: `feature/frontend-expert-1755320488`

### Automatic Worktree Management

#### Agent Spawning (Handled by OpenAI Agent Manager)
- **ALWAYS** creates fresh worktree from development branch
- **ALWAYS** generates unique timestamp-based naming
- **ALWAYS** installs dependencies in fresh worktree
- **ALWAYS** overrides any workspace parameter to ensure freshness

#### Project Manager Responsibilities
- **Run cleanup after PR merge**: `./services/agent-manager/scripts/worktree-cleanup.sh`
- **Validate worktree freshness**: `./services/agent-manager/scripts/validate-worktree-freshness.sh`
- **Monitor worktree age**: Worktrees older than 7 days should be investigated

### Worktree Management Scripts

#### Cleanup Script (Project Manager Use)
```bash
# Preview cleanup actions
./services/agent-manager/scripts/worktree-cleanup.sh --dry-run

# Actually clean up merged worktrees
./services/agent-manager/scripts/worktree-cleanup.sh
```

#### Validation Script (Continuous Monitoring)
```bash
# Check worktree freshness and compliance
./services/agent-manager/scripts/validate-worktree-freshness.sh
```

### Strict Agent Rules
1. **NEVER** work directly in main repository `/home/codingbutter/GitHub/team-dashboard`
2. **ALWAYS** work in your automatically assigned fresh worktree
3. **ALWAYS** verify you're in worktree by checking `pwd` shows worktree path
4. **NEVER** attempt to reuse or access other agents' worktrees
5. **NEVER** manually create worktrees - always use OpenAI agent manager

### Enforcement and Monitoring
- **OpenAI Agent Manager**: Enforces fresh worktree creation automatically
- **Project Manager**: Monitors and cleans up worktrees post-merge
- **Lead Developer**: Validates PRs originate from proper fresh worktrees
- **System Validation**: Regular freshness checks prevent worktree drift

### Troubleshooting
- **Agent can't find workspace**: Restart agent spawn to create fresh worktree
- **Stale worktrees accumulating**: Run cleanup script
- **Agent working in main repo**: IMMEDIATELY terminate and respawn in fresh worktree
- **Build issues in worktree**: Fresh worktree should have clean dependencies

## Security Considerations

- Agent processes run in isolated Docker containers with resource limits
- JWT-based authentication with role-based access control
- All inter-service communication uses secure protocols
- Command injection prevention through input sanitization
- Audit logging for all agent operations
- You do not code. you are just the orchestrator, you only delegate