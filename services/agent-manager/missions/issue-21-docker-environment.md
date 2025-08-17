# URGENT MISSION: Docker Development Environment - Issue #21

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #21 - Configure Docker development environment
**Priority**: P1 - HIGH PRIORITY
**Agent**: performance-engineering-specialist

## START CODING IMMEDIATELY!

### 1. CREATE THIS DOCKERFILE FIRST:
**File**: `/Dockerfile.dev`

```dockerfile
# Multi-stage build for development environment
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
RUN npm install -g pnpm@8.15.0
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY services/agent-manager/package.json ./services/agent-manager/
COPY services/system-monitor/package.json ./services/system-monitor/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/services/agent-manager/node_modules ./services/agent-manager/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

# Expose all necessary ports
EXPOSE 3000 3001 3002 8000 9090 3003

# Start development servers
CMD ["pnpm", "dev"]
```

### 2. CREATE DOCKER-COMPOSE FOR FULL STACK:
**File**: `/docker-compose.dev.yml`

```yaml
version: '3.9'

services:
  # Main application
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: dev
    container_name: team-dashboard-app
    volumes:
      - .:/app
      - /app/node_modules
      - /app/apps/dashboard/node_modules
      - /app/services/agent-manager/node_modules
    ports:
      - "3000:3000"  # Dashboard
      - "3001:3001"  # Agent Manager
      - "3002:3002"  # System Monitor
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://user:password@postgres:5432/team_dashboard
      - INFLUXDB_URL=http://influxdb:8086
    depends_on:
      - redis
      - postgres
      - influxdb
    networks:
      - team-dashboard
    command: pnpm dev

  # Agent spawner service
  agent-spawner:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: agent-spawner
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./services/agent-manager:/app
      - agent-workspaces:/workspaces
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - team-dashboard
    privileged: true

  # Redis
  redis:
    image: redis:7-alpine
    container_name: team-dashboard-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - team-dashboard
    command: redis-server --appendonly yes

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: team-dashboard-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: team_dashboard
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - team-dashboard

  # InfluxDB for metrics
  influxdb:
    image: influxdb:2.7-alpine
    container_name: team-dashboard-influxdb
    ports:
      - "8086:8086"
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: password123
      DOCKER_INFLUXDB_INIT_ORG: team-dashboard
      DOCKER_INFLUXDB_INIT_BUCKET: metrics
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: my-super-secret-auth-token
    volumes:
      - influxdb-data:/var/lib/influxdb2
    networks:
      - team-dashboard

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: team-dashboard-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - team-dashboard

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: team-dashboard-grafana
    ports:
      - "3003:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: redis-datasource
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus
      - influxdb
    networks:
      - team-dashboard

networks:
  team-dashboard:
    driver: bridge

volumes:
  redis-data:
  postgres-data:
  influxdb-data:
  prometheus-data:
  grafana-data:
  agent-workspaces:
```

### 3. CREATE AGENT DOCKERFILE:
**File**: `/Dockerfile.agent`

```dockerfile
FROM node:20-alpine

# Install Docker CLI for agent spawning
RUN apk add --no-cache docker-cli git

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy agent manager
COPY services/agent-manager/package.json ./
RUN pnpm install

COPY services/agent-manager/ ./

# Build TypeScript
RUN pnpm build

EXPOSE 3001

CMD ["node", "dist/start-server.js"]
```

### 4. CREATE MAKEFILE FOR EASY COMMANDS:
**File**: `/Makefile`

```makefile
.PHONY: help dev prod build clean logs restart

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose -f docker-compose.dev.yml up

dev-build: ## Build and start development environment
	docker-compose -f docker-compose.dev.yml up --build

prod: ## Start production environment
	docker-compose -f docker-compose.yml up -d

build: ## Build all Docker images
	docker-compose -f docker-compose.dev.yml build

stop: ## Stop all containers
	docker-compose -f docker-compose.dev.yml down

clean: ## Clean up volumes and containers
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

logs: ## Show logs
	docker-compose -f docker-compose.dev.yml logs -f

logs-app: ## Show app logs only
	docker-compose -f docker-compose.dev.yml logs -f app

restart: ## Restart all services
	docker-compose -f docker-compose.dev.yml restart

shell: ## Open shell in app container
	docker-compose -f docker-compose.dev.yml exec app sh

db-shell: ## Open PostgreSQL shell
	docker-compose -f docker-compose.dev.yml exec postgres psql -U user -d team_dashboard

redis-cli: ## Open Redis CLI
	docker-compose -f docker-compose.dev.yml exec redis redis-cli

status: ## Show container status
	docker-compose -f docker-compose.dev.yml ps

test: ## Run tests in container
	docker-compose -f docker-compose.dev.yml exec app pnpm test

lint: ## Run linting in container
	docker-compose -f docker-compose.dev.yml exec app pnpm lint
```

### 5. CREATE PROMETHEUS CONFIG:
**File**: `/config/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'agent-manager'
    static_configs:
      - targets: ['agent-spawner:3001']
  
  - job_name: 'system-monitor'
    static_configs:
      - targets: ['app:3002']
  
  - job_name: 'dashboard'
    static_configs:
      - targets: ['app:3000']
```

## SUCCESS CRITERIA:
- [ ] All services start with `make dev`
- [ ] Hot reload working for development
- [ ] All databases accessible
- [ ] Monitoring stack operational
- [ ] Agent spawning works in containers
- [ ] Volumes persist data correctly

## DO THIS NOW!
1. Create ALL files above IMMEDIATELY
2. Run `make dev-build` to start everything
3. Verify all services are running: `make status`
4. Test hot reload by editing a file
5. Create PR with title: "feat: Docker development environment (Closes #21)"

**START CODING NOW! NO DELAYS!**