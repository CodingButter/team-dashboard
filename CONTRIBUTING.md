# Contributing to Team Dashboard

Thank you for your interest in contributing to the Team Dashboard project! This document provides comprehensive guidelines for our development workflow, PR process, and quality standards.

## Development Workflow Overview

We follow a structured development process with feature branches, code reviews, and automated quality gates. All development work flows through the `development` branch before reaching `main`.

### Branch Strategy

```
main (production-ready)
  └── development (integration branch)
        ├── feature/[issue-number]-description
        ├── fix/[issue-number]-description
        ├── refactor/[issue-number]-description
        └── chore/[issue-number]-description
```

### Getting Started

1. **Clone the Repository**:
```bash
git clone https://github.com/CodingButter/team-dashboard.git
cd team-dashboard
```

2. **Set Up Git Worktrees** (for parallel development):
```bash
# Create worktree for specific feature
git worktree add ../team-dashboard-[feature-name] -b feature/[issue-number]-description origin/development
```

3. **Install Dependencies**:
```bash
pnpm install
docker-compose up -d  # Start infrastructure services
```

4. **Create Feature Branch**:
```bash
# Always branch from development, not main
git checkout development
git pull origin development
git checkout -b feature/[issue-number]-description
```

### Branch Naming Conventions

- **feature/[issue-number]-description**: New features
- **fix/[issue-number]-description**: Bug fixes
- **refactor/[issue-number]-description**: Code refactoring
- **chore/[issue-number]-description**: Maintenance tasks
- **hotfix/[issue-number]-description**: Critical production fixes

Examples:
- `feature/42-add-openai-integration`
- `fix/108-websocket-connection-timeout`
- `refactor/76-extract-shared-components`

## Development Process

### 1. Pick an Issue
```bash
# Check your assigned issues
gh issue list --assignee @me --state open

# View issue details
gh issue view [issue-number]
```

### 2. Create Feature Branch
```bash
git checkout development
git pull origin development
git checkout -b feature/[issue-number]-description
```

### 3. Make Changes
- Follow the 200-line file limit (150 lines ideal)
- Maintain separation of concerns
- Use TypeScript strict mode
- Implement comprehensive error handling
- Add appropriate logging

### 4. Run Quality Checks
```bash
# Run all quality checks
pnpm lint           # ESLint checks
pnpm format         # Prettier formatting
pnpm typecheck      # TypeScript validation
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests (if applicable)
pnpm build          # Ensure builds succeed
```

### 5. Commit Changes
```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: #42 add OpenAI integration for agent communication"
```

### 6. Push and Create PR
```bash
# Push to origin
git push origin feature/[issue-number]-description

# Create PR via GitHub CLI
gh pr create --base development --title "feat: #42 Add OpenAI integration" --body "Closes #42"

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

## Pull Request Requirements

### PR Checklist (Required)
- [ ] Related issue linked (Closes #XXX)
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] File sizes under 200 lines
- [ ] TypeScript types properly defined
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Breaking changes documented

### PR Review Process

#### Response Time SLA
- **P0 (Critical)**: 2 hours
- **P1 (High)**: 4 hours
- **P2 (Medium)**: 8 hours
- **P3 (Low)**: 24 hours

#### Required Approvals
- **Architectural Changes**: Lead Developer + 1 domain expert
- **Security-Critical**: Lead Developer + Security specialist
- **Performance-Critical**: Performance specialist + 1 reviewer
- **Regular Features**: 2 approved reviews
- **Documentation/Tests**: 1 approved review

#### Automated Checks (Must Pass)
1. **CI/CD Pipeline**:
   - Linting (ESLint)
   - Formatting (Prettier)
   - Type checking (TypeScript)
   - Unit tests (>80% coverage)
   - Build verification
   - Bundle size check

2. **Code Quality Gates**:
   - No files > 200 lines
   - Cognitive complexity < 15
   - No security vulnerabilities
   - No performance regressions

### Merge Strategy

**Squash and Merge** is our default strategy:
- Keeps history clean
- One commit per feature
- Easier to revert if needed

```bash
# After approval, merge via CLI
gh pr merge [pr-number] --squash --delete-branch
```

### Conflict Resolution

1. **Update from development**:
```bash
git checkout development
git pull origin development
git checkout feature/your-branch
git rebase development
```

2. **Resolve conflicts**:
- Use VS Code merge editor
- Test thoroughly after resolution
- Re-run all quality checks

3. **Force push after rebase**:
```bash
git push origin feature/your-branch --force-with-lease
```

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

## Agent-Specific Workflows

### Frontend Expert
- Focus on React components and UI/UX
- Ensure accessibility standards (WCAG 2.1 AA)
- Optimize bundle sizes
- Implement responsive designs

### Performance Engineering Specialist
- Profile before and after changes
- Document performance metrics
- Use React DevTools Profiler
- Monitor WebSocket latency

### Code Quality Specialist
- Enforce file size limits
- Refactor complex functions
- Improve test coverage
- Update documentation

### Monorepo Architecture Specialist
- Manage package dependencies
- Optimize build processes
- Configure workspace tools
- Maintain CI/CD pipelines

### Backend Specialists
- Implement API contracts first
- Add comprehensive error handling
- Document API endpoints
- Include integration tests

## Daily Development Workflow

### Morning Routine
1. **Check GitHub Issues**:
```bash
gh issue list --assignee @me --state open
```

2. **Update Local Development**:
```bash
git checkout development
git pull origin development
```

3. **Review PR Feedback**:
```bash
gh pr status
```

### During Development
1. Work on highest priority issue (P0 > P1 > P2 > P3)
2. Commit frequently with descriptive messages
3. Run tests before pushing
4. Update issue status:
```bash
gh issue comment [issue-number] --body "Status: In progress - [description]"
```

### End of Day
1. Push all work to feature branch
2. Create draft PR if work is incomplete
3. Update issue with progress
4. Document any blockers

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

## Architecture Decision Records (ADRs)

Major technical decisions must be documented:

1. **Create ADR**:
```bash
# Create new ADR file
touch docs/architecture/decisions/ADR-[number]-[title].md
```

2. **ADR Template**:
```markdown
# ADR-[number]: [Title]

Date: [YYYY-MM-DD]
Status: [Proposed | Accepted | Deprecated]

## Context
[What is the issue we're addressing?]

## Decision
[What have we decided to do?]

## Consequences
[What are the positive and negative outcomes?]

## Alternatives Considered
[What other options were evaluated?]
```

## Code Review Guidelines

### For Reviewers

1. **Start with the Big Picture**:
   - Does this solve the issue?
   - Is the approach correct?
   - Are there architectural concerns?

2. **Check Code Quality**:
   - File size limits (200 lines max)
   - Function complexity
   - Type safety
   - Error handling

3. **Verify Tests**:
   - Adequate coverage
   - Edge cases handled
   - Integration tests for APIs

4. **Review Performance**:
   - No unnecessary re-renders
   - Efficient algorithms
   - Appropriate caching

5. **Security Considerations**:
   - Input validation
   - No exposed secrets
   - Proper authentication

### Review Comments

Use constructive feedback:
- ✅ "Consider using useMemo here to prevent unnecessary recalculations"
- ❌ "This is wrong"

- ✅ "This could cause a memory leak. Here's how to fix it: [example]"
- ❌ "Bad code"

## Questions and Support

- **Technical Questions**: Create a discussion in GitHub Discussions
- **Bug Reports**: Open an issue with reproduction steps
- **Feature Requests**: Open an issue with use case description
- **Architecture Discussions**: Schedule a technical review meeting

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Team Dashboard!