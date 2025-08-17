# Git Service

A comprehensive Git integration service for the Team Dashboard platform that provides secure repository management, version control operations, and collaboration features.

## Features

### Core Git Operations
- **Repository Management**: Clone, initialize, and manage Git repositories
- **Branch Operations**: Create, checkout, merge, and delete branches
- **Commit Operations**: Stage files, commit changes with proper validation
- **Remote Operations**: Push, pull, fetch with authentication
- **History Management**: View commit history, diffs, and blame information

### Security Features
- **Credential Management**: Secure storage and encryption of Git credentials
- **Authentication Support**: SSH keys, HTTPS tokens, OAuth integration
- **URL Validation**: Prevent malicious repository URLs and path traversal
- **Input Sanitization**: Comprehensive validation of all user inputs
- **Rate Limiting**: Protection against abuse and resource exhaustion

### Provider Integration
- **GitHub Integration**: Full GitHub API support for PR management
- **GitLab Support**: Ready for GitLab API integration
- **Bitbucket Support**: Ready for Bitbucket API integration
- **Generic Git Servers**: Support for self-hosted Git instances

### Enterprise Features
- **Audit Logging**: Complete audit trail of all Git operations
- **Role-Based Access**: Integration with team permission systems
- **Compliance**: PCI DSS and enterprise security standards
- **Monitoring**: Performance metrics and health monitoring

## Architecture

### Service Structure
```
services/git-service/
├── src/
│   ├── git-service.ts           # Main service class
│   ├── types.ts                 # TypeScript definitions
│   ├── index.ts                 # HTTP server and API routes
│   ├── auth/
│   │   └── credential-manager.ts # Secure credential storage
│   ├── security/
│   │   └── security-manager.ts  # Security validation and policies
│   └── providers/
│       └── github-provider.ts   # GitHub API integration
├── tests/
│   ├── git-service.test.ts      # Core service tests
│   └── api.test.ts              # API endpoint tests
├── Dockerfile.dev               # Development container
└── package.json                 # Dependencies and scripts
```

### Technology Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Git Library**: simple-git for Git operations
- **Authentication**: bcrypt for encryption, JWT for tokens
- **Storage**: Redis for caching and credential storage
- **HTTP Framework**: Fastify for high-performance API
- **Testing**: Vitest with comprehensive test coverage
- **Security**: Input validation, credential encryption, audit logging

## API Endpoints

### Repository Management
- `POST /repositories/clone` - Clone a repository
- `GET /repositories` - List all repositories
- `GET /repositories/:id` - Get repository details

### Branch Operations
- `POST /repositories/:id/branches` - Create a new branch
- `POST /repositories/:id/checkout` - Switch branches

### File Operations
- `POST /repositories/:id/stage` - Stage files for commit
- `POST /repositories/:id/commit` - Commit staged changes

### Remote Operations
- `POST /repositories/:id/push` - Push changes to remote
- `POST /repositories/:id/pull` - Pull changes from remote
- `GET /repositories/:id/history` - View commit history

### Pull Request Management
- `POST /repositories/:id/pull-requests` - Create pull request
- `GET /repositories/:id/pull-requests` - List pull requests

## Security Model

### Credential Security
- **Encryption**: AES-256-GCM encryption for stored credentials
- **Key Management**: Secure encryption key rotation
- **Isolation**: Per-repository credential isolation
- **Validation**: Comprehensive credential validation before storage

### Input Validation
- **URL Security**: Validate repository URLs against allow/block lists
- **Path Security**: Prevent directory traversal attacks
- **Branch Names**: Validate branch names against Git standards
- **Commit Messages**: Sanitize commit messages to prevent injection

### Access Control
- **Authentication**: Integration with team authentication system
- **Authorization**: Repository-level access control
- **Audit Trail**: Complete logging of all operations
- **Rate Limiting**: Protection against abuse

## Configuration

### Environment Variables
```bash
# Service Configuration
PORT=3006
HOST=0.0.0.0
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Security Configuration
ENCRYPTION_KEY=your-32-character-encryption-key
GIT_WORKSPACE_ROOT=/tmp/git-workspace

# Provider Configuration (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITLAB_CLIENT_ID=your-gitlab-client-id
GITLAB_CLIENT_SECRET=your-gitlab-client-secret
```

### Repository Workspace
The service creates isolated workspaces for each repository:
```
/tmp/git-workspace/
├── repo-uuid-1/          # Repository workspace
├── repo-uuid-2/          # Another repository
└── ...
```

## Development

### Installation
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Type checking
pnpm typecheck
```

### Docker Development
```bash
# Build and start with Docker Compose
docker-compose up git-service

# The service will be available at http://localhost:3006
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test git-service.test.ts
```

## Integration with Agent Manager

The Git service integrates with the Agent Manager to provide Git capabilities to AI agents:

### Service Discovery
- Registered in service registry on port 3006
- Health checks available at `/health`
- Metrics exposed for monitoring

### Agent Integration
Agents can use the Git service through:
1. **Direct API calls** to perform Git operations
2. **Event-based workflows** for automated Git workflows
3. **Webhook integration** for responding to repository events

### Example Agent Workflow
```typescript
// Agent clones repository
const repo = await gitService.cloneRepository(
  'https://github.com/team/project.git',
  'project-repo',
  credentials
);

// Agent creates feature branch
await gitService.createBranch(repo.id, 'feature/ai-enhancement');

// Agent makes changes and commits
await gitService.stageFiles(repo.id, ['src/enhanced-feature.ts']);
await gitService.commit(repo.id, 'Add AI-powered feature enhancement');

// Agent creates pull request
await gitService.createPullRequest(repo.id, {
  title: 'AI Enhancement: Automated Code Improvements',
  body: 'Automated improvements generated by AI agent',
  head: 'feature/ai-enhancement',
  base: 'main'
});
```

## Production Deployment

### Security Checklist
- [ ] Change default encryption keys
- [ ] Configure proper Redis security
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup procedures

### Monitoring
- **Health Endpoint**: `/health` for service status
- **Metrics**: Performance and usage metrics
- **Logging**: Structured logging with correlation IDs
- **Alerts**: Security and performance alerts

### Scaling
- **Horizontal Scaling**: Multiple service instances
- **Load Balancing**: Distribute requests across instances
- **Caching**: Redis for performance optimization
- **Resource Limits**: Configure memory and CPU limits

## License

This service is part of the Team Dashboard platform and follows the same licensing terms.

## Contributing

Please follow the established patterns and security guidelines when contributing to this service. All changes require:
- TypeScript type safety
- Comprehensive test coverage
- Security review for credential handling
- Documentation updates