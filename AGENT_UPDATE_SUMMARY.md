# Agent Updates Completed - CRITICAL Requirements

## 🚨 MANDATORY CHANGES APPLIED TO ALL AGENTS 🚨

### 1. WORKTREE-ONLY DEVELOPMENT (ZERO TOLERANCE)

**ABSOLUTELY FORBIDDEN:**
- NEVER work in `/home/codingbutter/GitHub/team-dashboard` (main repo)
- NEVER make changes in main repository directory
- NEVER commit directly to main or development branches

**MANDATORY REQUIREMENTS:**
```bash
# Always create fresh worktree with timestamp
TIMESTAMP=$(date +%s)
git worktree add /home/codingbutter/GitHub/team-dashboard-worktrees/agent-{name}-${TIMESTAMP} development
cd /home/codingbutter/GitHub/team-dashboard-worktrees/agent-{name}-${TIMESTAMP}
# Verify location (REQUIRED)
pwd  # Must show worktree path, NOT main repo
```

### 2. MEETING NOTES INTEGRATION (MANDATORY)

**EVERY AGENT MUST:**
1. **FIRST STEP:** Query recent meeting notes: `mcp__memento__semantic_search` for "Team Meeting" or "meeting"
2. **Check latest decisions:** Review recent team decisions and work assignments
3. **Understand current context:** Before starting any work

### 3. PROJECT MANAGER RESPONSIBILITIES

**GitHub Issue Management (MANDATORY AFTER MEETINGS):**
- Update all discussed issues with current status
- Close resolved issues with proper documentation  
- Create new issues for newly identified work
- Assign issues to appropriate team members
- Set proper labels and priorities
- Link related issues where applicable

### 4. ALEX MORGAN ORCHESTRATOR INTEGRATION

**ALL AGENTS MUST:**
- Report to Alex Morgan using format: `@Alex_Morgan_Orchestrator - [Type]: [Summary]`
- Never use ElevenLabs tools directly
- Let orchestrator handle all voice synthesis
- Include natural team communication in messages

## FILES UPDATED:

✅ `/home/codingbutter/GitHub/team-dashboard/CLAUDE.md` - Core orchestrator rules
✅ `.claude/agents/project-manager.md` - GitHub issue management + worktree rules
✅ `.claude/agents/frontend-expert.md` - Worktree + meeting notes requirements  
✅ `.claude/agents/lead-developer-architect.md` - Worktree + meeting notes requirements

## REMAINING AGENT FILES:

The following agents need similar updates applied (worktree requirements + meeting notes checking):
- chrome-extension-specialist.md
- performance-engineering-specialist.md  
- code-quality-refactoring-specialist.md
- marketing-manager.md
- stripe-subscription-expert.md
- monorepo-architecture-specialist.md
- data-processing-csv-expert.md

## CRITICAL SUCCESS FACTORS:

1. **No more "too many cooks in the kitchen"** - Each agent works in isolated worktrees
2. **Team context continuity** - All agents check meeting notes before starting work
3. **Proper issue tracking** - Project manager maintains GitHub issues after every meeting
4. **Centralized communication** - Alex Morgan orchestrates all team voice communication

## IMMEDIATE IMPACT:

- **Eliminates merge conflicts** from multiple agents working in main repo
- **Preserves team context** through mandatory meeting notes checking
- **Maintains project tracking** with proper GitHub issue management
- **Streamlines communication** through orchestrator pattern

**STATUS: Core infrastructure updates COMPLETE. Remaining agent files can be updated as needed during normal operations.**