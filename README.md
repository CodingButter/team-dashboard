# Team Management Dashboard

A comprehensive web-based dashboard for managing multiple Claude Code instances with real-time monitoring and visualization capabilities.

## Features

- **Agent Management**: Spawn and control multiple Claude Code instances
- **Interactive Frames**: Direct bidirectional communication with each agent
- **System Monitoring**: Real-time CPU, memory, GPU, and network metrics
- **Neo4j Visualization**: Explore semantic memory relationships
- **Workflow Enhancement**: GitHub integration and team coordination tools

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose
- Python 3.11+ (for monitoring services)
- Neo4j database (existing or new instance)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/team-dashboard.git
cd team-dashboard
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development services:
```bash
# Start Docker services (Neo4j, Redis, etc.)
docker-compose up -d

# Start the development server
pnpm dev
```

5. Open the dashboard:
```bash
open http://localhost:3000
```

## Project Structure

```
team-dashboard/
├── apps/
│   ├── dashboard/          # Next.js frontend application
│   └── docs/              # Documentation site
├── services/
│   ├── agent-manager/     # Node.js agent spawning service
│   ├── system-monitor/    # Python monitoring service
│   └── neo4j-bridge/      # Neo4j connection service
├── packages/
│   ├── ui/               # Shared UI components
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Shared utilities
└── docker/               # Docker configurations
```

## Development

### Available Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages and applications
- `pnpm test` - Run test suite
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

### Architecture

The system uses a microservices architecture with:
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js (Fastify) + Python (FastAPI) services
- **Communication**: WebSockets for real-time updates
- **Database**: Neo4j for semantic memory storage
- **Monitoring**: Prometheus + Grafana stack

## Documentation

- [Project Scope](./PROJECT_SCOPE.md) - Detailed project specifications
- [API Documentation](./docs/API.md) - API specifications
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

## Team

This project is developed by a specialized team of AI agents:
- Lead Developer/Architect
- Frontend Expert
- Performance Engineering Specialist
- Data Processing Expert
- Monorepo Architecture Specialist
- Chrome Extension Specialist
- Project Manager

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/team-dashboard/issues)
- Documentation: [Read the docs](./docs/)

---

**Current Status**: 🚧 Under Development (Phase 1/6)