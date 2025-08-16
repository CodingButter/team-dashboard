# Contributing to Team Dashboard

Thank you for your interest in contributing to the Team Dashboard project! This document provides guidelines and instructions for contributing.

## Development Process

We follow an Agile development process with 2-week sprints and daily standups.

### Getting Started

1. **Fork and Clone**:
```bash
git clone https://github.com/yourusername/team-dashboard.git
cd team-dashboard
```

2. **Install Dependencies**:
```bash
pnpm install
```

3. **Create a Branch**:
```bash
git checkout -b feature/your-feature-name
```

4. **Make Changes**:
- Write clean, maintainable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

5. **Test Your Changes**:
```bash
pnpm test
pnpm lint
pnpm typecheck
```

6. **Submit a Pull Request**:
- Push your branch to your fork
- Create a pull request with a clear description
- Link any related issues

## Code Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Maintain 80% test coverage minimum
- Use functional components for React

### File Organization
- Maximum 200 lines per file
- Single responsibility principle
- Clear, descriptive naming

### Commit Messages
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

Example:
```
feat: add real-time metrics dashboard
fix: resolve WebSocket connection timeout
docs: update API documentation
```

## Project Structure

### Apps
- `dashboard/` - Main Next.js application
- `docs/` - Documentation site

### Services
- `agent-manager/` - Agent lifecycle management
- `system-monitor/` - System metrics collection
- `neo4j-bridge/` - Graph database interface

### Packages
- `ui/` - Reusable UI components
- `types/` - Shared TypeScript types
- `utils/` - Common utilities

## Testing

### Unit Tests
```bash
pnpm test:unit
```

### Integration Tests
```bash
pnpm test:integration
```

### E2E Tests
```bash
pnpm test:e2e
```

## Documentation

- Update README.md for user-facing changes
- Update inline code comments
- Add JSDoc comments for public APIs
- Update architecture diagrams when needed

## Code Review Process

1. All code must be reviewed before merging
2. Reviews focus on:
   - Code quality and maintainability
   - Performance implications
   - Security considerations
   - Test coverage
   - Documentation completeness

## Issue Management

### Creating Issues
- Use issue templates
- Provide clear reproduction steps for bugs
- Include expected vs actual behavior
- Add relevant labels

### Issue Labels
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `performance` - Performance related
- `security` - Security issues
- `good first issue` - Good for newcomers

## Development Workflow

### Daily Tasks
1. Check assigned issues
2. Update task status in project board
3. Participate in daily standup
4. Submit PR for review

### Sprint Planning
- Every 2 weeks
- Review backlog
- Estimate tasks
- Assign to team members

## Performance Guidelines

- Maintain 60fps UI interactions
- WebSocket latency < 50ms
- Page load time < 2 seconds
- Memory usage < 500MB per agent

## Security Guidelines

- Never commit secrets or API keys
- Sanitize all user inputs
- Use HTTPS for all communications
- Follow OWASP best practices

## Questions?

- Check existing issues and discussions
- Ask in team chat
- Create a discussion for broader topics

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Team Dashboard!