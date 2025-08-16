# Agent Specifications for Team Dashboard

## Fresh Worktree Agent Architecture

### Core Principles
1. **Fresh Worktrees Only**: Every agent spawn creates a brand new worktree
2. **Timestamp-Based Uniqueness**: All workspaces use millisecond timestamps for guaranteed uniqueness
3. **Clean State**: Each agent starts with clean dependencies and latest development branch
4. **Isolation**: Agents never interfere with each other's workspaces
5. **Systematic Cleanup**: Project Manager handles worktree lifecycle management

### Agent Naming Convention
```
Worktree Path: /home/codingbutter/GitHub/team-dashboard-worktrees/agent-{name}-{timestamp}
Branch Name: feature/{name}-{timestamp}
Agent ID: {name}-{timestamp}
```

**Example:**
```
Worktree: /home/codingbutter/GitHub/team-dashboard-worktrees/agent-frontend-expert-1755326789123
Branch: feature/frontend-expert-1755326789123
Agent ID: frontend-expert-1755326789123
```

### Worktree Lifecycle

#### 1. Agent Spawn (OpenAI Agent Manager)
```typescript
// Automatic fresh worktree creation
const timestamp = Date.now();
const agentName = config.name.toLowerCase().replace(/\s+/g, '-');
const freshWorkspace = `/home/codingbutter/GitHub/team-dashboard-worktrees/agent-${agentName}-${timestamp}`;

// Always override workspace to ensure freshness
config.workspace = freshWorkspace;

// Create from development branch
execSync(`git worktree add ${config.workspace} -b feature/${agentName}-${timestamp} development`);

// Install fresh dependencies
execSync(`pnpm install`, { cwd: config.workspace });
```

#### 2. Agent Development Phase
- Agent works exclusively in their fresh worktree
- No access to other agents' workspaces
- Clean dependency state guaranteed
- Isolated from main repository

#### 3. PR Creation
- Feature branch created from development
- PR title: `fix: #123 description` or `feat: description`
- PR body must reference: `Closes #123` (if applicable)

#### 4. PR Merge (Lead Developer)
- Code review and quality verification
- Merge to development branch
- Branch marked for cleanup

#### 5. Worktree Cleanup (Project Manager)
- Run cleanup script after successful merge
- Remove worktree and local branch
- Prune stale references

### Agent Types and Responsibilities

#### Frontend Specialists
- **frontend-expert**: React, Next.js, UI components
- **ui-ux-specialist**: Design implementation, styling
- **chrome-extension-specialist**: Browser extension development

#### Backend Specialists  
- **backend-specialist**: API development, server logic
- **performance-engineering-specialist**: Performance optimization
- **monorepo-architecture-specialist**: Build systems, monorepo management

#### Quality Specialists
- **code-quality-refactoring-specialist**: Code cleanup, refactoring
- **testing-specialist**: Test creation and maintenance
- **security-specialist**: Security audits and fixes

#### Data Specialists
- **data-processing-csv-expert**: CSV processing, data transformation
- **database-specialist**: Database design and optimization

#### Integration Specialists
- **stripe-subscription-expert**: Payment integration
- **workflow-coordination-specialist**: Process automation

### Fresh Worktree Enforcement

#### OpenAI Agent Manager Validation
```typescript
// MANDATORY: Always create fresh worktree
if (!config.workspace || !config.workspace.includes('team-dashboard-worktrees')) {
  // Force fresh worktree creation
  const freshWorkspace = generateFreshWorkspace(config.name);
  config.workspace = freshWorkspace;
  await createFreshWorktree(freshWorkspace);
}
```

#### Agent Spawn Checks
1. Validate workspace path contains `team-dashboard-worktrees`
2. Ensure timestamp-based naming convention
3. Verify workspace doesn't already exist
4. Create from latest development branch
5. Install fresh dependencies

#### Runtime Validation
- Agents verify they're in correct worktree on startup
- `pwd` command must show worktree path
- Git branch must match expected pattern
- No access to main repository directory

### Quality Gates

#### Pre-Deploy Validation
- Fresh worktree created successfully
- Dependencies installed without errors
- Development branch checked out
- Agent instructions file created

#### Development Quality Gates
- TypeScript compilation passes
- ESLint rules enforced
- File size limits (<200 lines) enforced
- Test coverage maintained

#### Pre-PR Quality Gates
- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes
- Manual functionality testing
- Code review ready

### Monitoring and Management

#### Scripts Available
1. **worktree-cleanup.sh**: Remove merged worktrees
2. **validate-worktree-freshness.sh**: Health check all worktrees  
3. **monitor-fresh-agents.sh**: Real-time agent monitoring
4. **deploy-agents.sh**: Deploy multiple agents with fresh worktrees

#### Key Metrics
- Fresh worktree compliance rate
- Stale worktree count
- Agent workspace isolation
- Cleanup effectiveness
- Deployment success rate

#### Troubleshooting

**Agent not in fresh worktree:**
```bash
# Terminate agent immediately
# Spawn new agent (will auto-create fresh worktree)
```

**Stale worktrees accumulating:**
```bash
./services/agent-manager/scripts/worktree-cleanup.sh --dry-run
./services/agent-manager/scripts/worktree-cleanup.sh
```

**Build errors in worktree:**
```bash
# Fresh worktree should have clean state
cd $AGENT_WORKTREE
pnpm install --force
```

**Agent working in main repo:**
```bash
# CRITICAL: Immediate termination required
# This violates fresh worktree mandate
```

### Security Considerations

#### Workspace Isolation
- Each agent has completely isolated filesystem workspace
- No shared state between agents
- Clean dependency installation
- Branch isolation

#### Access Control
- Agents cannot access other agents' worktrees
- No write access to main repository
- Controlled PR creation process
- Branch protection rules enforced

#### Data Protection
- Fresh environment prevents data leakage
- No residual state from previous tasks
- Clean Git history per agent
- Secure credential handling

### Performance Benefits

#### Development Speed
- No dependency conflicts
- Clean build state
- Parallel development without interference
- Fast agent spawn with automated setup

#### Resource Efficiency
- Cleanup removes unused workspaces
- Fresh installs prevent bloated node_modules
- Isolated processes prevent memory leaks
- Automatic garbage collection

#### Quality Assurance
- Guaranteed clean state for testing
- No interference between agent changes
- Reproducible development environment
- Consistent dependency versions

## Implementation Status

### ✅ Completed Components
- Fresh worktree creation in OpenAI Agent Manager
- Timestamp-based unique naming system
- Automatic dependency installation
- Worktree cleanup automation
- Validation and monitoring scripts
- Updated CLAUDE.md documentation

### 🔄 Active Enforcement
- OpenAI Agent Manager creates fresh worktrees automatically
- Project Manager handles systematic cleanup
- Lead Developer validates PR origins
- Continuous monitoring for compliance

### 📈 Success Metrics
- 100% fresh worktree compliance for new agents
- Zero stale worktree accumulation
- Improved agent isolation and performance
- Streamlined development workflow

**Last Updated**: August 16, 2025  
**Document Version**: 1.0  
**Architecture Lead**: Lead Developer Architect