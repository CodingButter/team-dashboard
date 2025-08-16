# Team Dashboard - Delegation Structure & Responsibilities
*Last Updated: 2025-08-16*

## Team Hierarchy & Delegation Flow

### Project Manager (Current Role)
**Primary Responsibilities:**
- Sprint planning and facilitation
- Resource allocation and workload balancing
- Risk assessment and mitigation
- Stakeholder communication
- Process improvement
- Worktree cleanup after PR merges
- Progress tracking and reporting

**MUST NEVER DO:**
- Write any code
- Make technical architecture decisions
- Debug issues directly
- Create technical documentation
- Perform work that specialists should handle

**MUST DELEGATE TO:**
- Lead Developer for all technical assignments
- Lead Developer for architecture decisions
- Specialists (through Lead Developer) for implementation

### Lead Developer Architect
**Responsibilities:**
- Technical architecture decisions
- Code review coordination
- PR reviews and merging
- Task assignment to specialists
- Technical risk assessment
- Conflict resolution (technical)
- Development standards enforcement

**Manages:**
- Frontend Expert
- Backend Specialists
- Chrome Extension Specialist
- Performance Engineering Specialist
- Code Quality/Refactoring Specialist
- Data Processing/CSV Expert
- Stripe Subscription Expert

### Specialist Roles & Assignments

#### Frontend Expert
**Domain:** Dashboard UI, React components, Next.js
**Current Tasks:**
- Issue #13: Agent creation wizard UI
- Issue #12: Agent terminal with xterm.js
- Issue #26: Real-time system monitoring dashboard
- Issue #25: Tool approval workflow UI
- Issue #15: System prompt editor
- Issue #14: MCP server configuration UI
- Issue #47: Dark mode toggle bug fix

#### Backend Specialist
**Domain:** Node.js services, API development
**Current Tasks:**
- Issue #10: STDIO transport layer for MCP
- Issue #9: MCP server manager service
- Issue #7: Conversation memory management
- Issue #8: Token optimization and cost tracking
- Issue #11: HTTP+SSE transport
- Issue #23: Inter-agent communication
- Issue #24: Sequential workflow coordinator
- Issue #33: Memento MCP integration

#### Chrome Extension Specialist
**Domain:** Browser extensions, Chrome APIs
**Current Tasks:**
- Support for agent browser interactions
- Extension security and permissions

#### Performance Engineering Specialist
**Domain:** Optimization, monitoring, metrics
**Current Tasks:**
- System monitoring service
- Performance metrics collection
- 60fps dashboard performance
- Resource usage optimization

#### Code Quality/Refactoring Specialist
**Domain:** Code standards, refactoring
**Current Tasks:**
- Refactor files approaching 200-line limit
- ESLint compliance
- Code review support
- Technical debt reduction

#### Testing Specialist
**Domain:** Test frameworks, E2E testing
**Current Tasks:**
- Issue #17: Playwright E2E testing
- Issue #18: Mock OpenAI responses
- Issue #28: MCP server test fixtures
- Issue #29: Code coverage reporting
- Issue #5: Testing framework epic

#### Infrastructure/DevOps Specialist
**Domain:** Docker, CI/CD, deployment
**Current Tasks:**
- Issue #20: GitHub Actions CI/CD
- Issue #21: Docker development environment
- Issue #34: Production deployment pipeline
- Infrastructure monitoring

## Delegation Workflow

### Standard Task Flow
1. **Stakeholder/User** → Provides requirements
2. **Project Manager** → Breaks down into tasks, assesses priority
3. **Project Manager** → Coordinates with Lead Developer on technical approach
4. **Lead Developer** → Assigns technical work to appropriate specialists
5. **Specialists** → Implement solutions in fresh worktrees
6. **Lead Developer** → Reviews code and approves PRs
7. **Project Manager** → Tracks progress, removes blockers, reports status
8. **Project Manager** → Cleans up worktrees after PR merge

### Issue Assignment Status

#### Assigned Issues
- **CodingButter** (3 issues):
  - #33: Memento MCP integration (P0)
  - #24: Sequential workflow coordinator (P0)
  - #9: MCP server manager service (P0)

#### Unassigned P0 Issues (Need Immediate Assignment)
1. #13: Agent creation wizard UI → Frontend Expert
2. #12: Agent terminal with xterm.js → Frontend Expert
3. #10: STDIO transport layer → Backend Specialist
4. #7: Conversation memory system → Backend Specialist

#### Unassigned P1 Issues
- Frontend: #47, #26, #25, #15, #14
- Backend: #23, #11, #8
- Infrastructure: #21, #20, #34
- Testing: #17
- Documentation: #32

## Current Sprint Assignments

### In Progress
- PR #60: WebSocket port conflict (ready to merge)
- PR #48: Sequential workflow (has conflicts - needs resolution)
- Multiple PRs (#55-59) need review

### Blocked Items
- PR #48: Merge conflicts blocking workflow coordinator
- Memento MCP authentication issues preventing memory storage

### Ready to Start
- All unassigned P0 issues need immediate specialist assignment
- Files approaching 200-line limit need refactoring

## Delegation Rules Enforcement

### Red Flags - Delegation Violations
❌ Project Manager writing code
❌ Project Manager making architecture decisions
❌ Specialists idle while PM does technical work
❌ Direct task assignment to specialists (bypassing Lead Developer)
❌ Technical documentation created by non-specialists

### Correct Delegation Examples
✅ PM identifies need → Lead assigns to specialist
✅ PM tracks progress → Specialist implements
✅ PM removes blockers → Team stays productive
✅ PM reports status → Stakeholders stay informed
✅ PM facilitates → Team collaborates effectively

## Communication Channels

### Daily Standup (Issue #30)
- Time: Daily check-ins
- Participants: All active team members
- Purpose: Progress updates, blocker identification

### Sprint Planning
- Frequency: Per sprint
- Led by: Project Manager
- Purpose: Task breakdown, estimation, commitment

### PR Reviews
- Reviewer: Lead Developer
- Approver: Lead Developer (to development), PM (to main)
- Timeline: Within 4 hours of submission

### Blocker Resolution (Issue #31)
- Escalation: Specialist → Lead Developer → Project Manager
- Response Time: P0 (immediate), P1 (4 hours), P2 (24 hours)

## Success Metrics

### Project Manager Success
- Sprint velocity maintained or improved
- Zero delegation violations
- All blockers resolved within SLA
- Team satisfaction high
- Stakeholder updates on schedule

### Team Success
- All P0 issues completed on time
- Code quality standards maintained
- No files exceed 200-line limit
- Test coverage improving
- Zero production incidents

## Immediate Action Items

### For Project Manager
1. Have Lead Developer assign unassigned P0 issues
2. Track PR review progress
3. Run worktree cleanup for merged branches
4. Update stakeholders on sprint progress
5. Facilitate blocker resolution for PR #48

### For Lead Developer
1. Assign specialists to unassigned P0 issues
2. Review and merge PR #60
3. Resolve conflicts in PR #48
4. Review PRs #55-59
5. Coordinate refactoring of large files

### For Specialists
1. Complete assigned P0 issues
2. Work in fresh worktrees only
3. Follow 200-line file limit
4. Update issue status regularly
5. Escalate blockers immediately

---
*This document defines the complete delegation structure and responsibilities for the Team Dashboard project.*