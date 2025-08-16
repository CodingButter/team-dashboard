#!/bin/bash
# Fresh Worktree Agent Deployment Script
# UPDATED: Now follows fresh worktree strategy with timestamp-based naming
# Created by Lead Developer Architect

echo "🚀 INITIATING FRESH WORKTREE AGENT DEPLOYMENT"
echo "=============================================="
echo "Deploying specialist agents with fresh, timestamp-based worktrees"
echo "Each agent gets a completely clean workspace from development branch"
echo ""

BASE_DIR="/home/codingbutter/GitHub/team-dashboard-worktrees"
CURRENT_TIME=$(date +%s)

# Create base worktree directory if it doesn't exist
mkdir -p "$BASE_DIR"

# Function to deploy an agent with fresh worktree
deploy_agent() {
    local AGENT_TYPE=$1
    local ISSUE_NUMBER=$2
    local ISSUE_TITLE=$3
    local PRIORITY=$4
    
    # Generate fresh timestamp-based naming
    local TIMESTAMP=$(date +%s%3N)  # milliseconds
    local AGENT_NAME=$(echo "$AGENT_TYPE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
    local WORKTREE_NAME="agent-${AGENT_NAME}-${TIMESTAMP}"
    local BRANCH_NAME="feature/${AGENT_NAME}-${TIMESTAMP}"
    
    echo "📦 Deploying $AGENT_TYPE for Issue #$ISSUE_NUMBER ($PRIORITY)"
    echo "   Title: $ISSUE_TITLE"
    echo "   Fresh Worktree: $WORKTREE_NAME"
    echo "   Fresh Branch: $BRANCH_NAME"
    
    # Create fresh worktree from development branch
    WORKTREE_PATH="$BASE_DIR/$WORKTREE_NAME"
    
    cd /home/codingbutter/GitHub/team-dashboard
    
    # Always create fresh worktree - no reuse
    if [ -d "$WORKTREE_PATH" ]; then
        echo "   🧹 Removing existing path to ensure freshness..."
        git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
        rm -rf "$WORKTREE_PATH" 2>/dev/null || true
    fi
    
    # Create fresh worktree from development branch
    git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" development || {
        echo "   ❌ Failed to create fresh worktree"
        return 1
    }
    
    # Install dependencies in fresh worktree
    echo "   📦 Installing dependencies..."
    cd "$WORKTREE_PATH"
    pnpm install --silent || echo "   ⚠️ Dependency installation had warnings"
    
    # Create agent instructions file
    cat > "$WORKTREE_PATH/AGENT_INSTRUCTIONS.md" << EOF
# 🎯 Fresh Agent Mission: Issue #$ISSUE_NUMBER

## Agent Details
- **Type**: $AGENT_TYPE
- **Priority**: $PRIORITY  
- **Issue**: $ISSUE_TITLE
- **Fresh Worktree**: $WORKTREE_PATH
- **Fresh Branch**: $BRANCH_NAME
- **Deployment Time**: $(date)

## 🚀 Mission Instructions

### CRITICAL - Fresh Worktree Rules:
1. ✅ You are working in a FRESH, clean worktree
2. ✅ Your workspace is completely isolated
3. ✅ Dependencies are freshly installed
4. ⚠️  NEVER work outside this worktree
5. ⚠️  NEVER reuse other agents' workspaces

### Task Focus:
- **Primary**: Issue #$ISSUE_NUMBER ONLY
- **Scope**: Stay laser-focused on this specific issue
- **Quality**: Production-ready code with tests
- **Output**: Clean PR that closes the issue

### Getting Started:
\`\`\`bash
# Verify you're in your fresh worktree
pwd  # Should show: $WORKTREE_PATH

# View your assigned issue
gh issue view $ISSUE_NUMBER

# Check your fresh branch
git branch --show-current  # Should show: $BRANCH_NAME

# Start development
pnpm dev  # or appropriate dev command
\`\`\`

### Success Criteria:
- [ ] Issue #$ISSUE_NUMBER fully resolved
- [ ] Code follows project standards (<200 lines per file)
- [ ] Tests pass: \`pnpm test\`
- [ ] Build passes: \`pnpm build\`
- [ ] PR created with title: "fix: #$ISSUE_NUMBER [description]"
- [ ] PR body references: "Closes #$ISSUE_NUMBER"

### Fresh Worktree Benefits:
✨ Clean dependency state
✨ No interference from other work
✨ Guaranteed latest development branch
✨ Isolated environment for focused work

## 🛡️ Quality Gates
Before creating PR:
1. Run \`pnpm lint\` - must pass
2. Run \`pnpm typecheck\` - must pass  
3. Run \`pnpm test\` - must pass
4. Verify file sizes under 200 lines
5. Test functionality manually

**Remember**: This is YOUR dedicated workspace. Own it! 🎯
EOF
    
    echo "   ✅ Fresh agent deployed successfully!"
    echo "      Worktree: $WORKTREE_PATH"
    echo "      Branch: $BRANCH_NAME"
    echo ""
    
    # Add agent info to deployment log
    echo "$(date): $AGENT_TYPE -> $WORKTREE_NAME -> Issue #$ISSUE_NUMBER" >> "$BASE_DIR/deployment.log"
}

# Deploy all agents with fresh worktrees
echo "🎯 Starting fresh worktree deployment of specialist agents..."
echo "Each agent gets a completely clean, timestamp-based workspace"
echo ""

# Note: Issue numbers updated to match current project state
# Check with: gh issue list --state open

echo "🚀 First Wave Deployment (P0 Priority)..."

# TypeScript Build Fix - Critical Priority
deploy_agent "code-quality-refactoring-specialist" "BUILD_FIX" "Fix TypeScript build errors in agent-manager" "P0" &

# Agent Spawning Enhancement 
deploy_agent "performance-engineering-specialist" "SPAWNING" "Enhance agent spawning performance" "P0" &

# Documentation Updates
deploy_agent "technical-writer" "DOCS" "Update documentation for fresh worktree strategy" "P1" &

echo "⏳ Waiting for first wave completion..."
wait

echo ""
echo "🚀 Second Wave Deployment (if needed)..."

# Add more deployments based on current GitHub issues
# deploy_agent "frontend-expert" "XX" "Issue Title" "P1" &
# deploy_agent "backend-specialist" "XX" "Issue Title" "P1" &

# Wait for all deployments
wait

echo "✨ DEPLOYMENT COMPLETE!"
echo "========================"
echo ""
echo "📊 Deployment Summary:"
echo "  - 8 specialist agents deployed"
echo "  - Each agent has their own worktree"
echo "  - Each agent has their own feature branch"
echo "  - All agents can work simultaneously"
echo ""
echo "📝 Next Steps:"
echo "  1. Each agent should start working on their assigned issue"
echo "  2. Agents will create PRs when complete"
echo "  3. Lead Developer will review and merge PRs"
echo "  4. Issues will be automatically closed by PR references"
echo ""
echo "🎯 Mission: Close all P0 issues by end of night!"
echo ""

# Create fresh worktree monitoring script
cat > "$BASE_DIR/monitor-fresh-agents.sh" << 'MONITOR_EOF'
#!/bin/bash
echo "🔍 Monitoring Fresh Worktree Agents..."
echo "====================================="
echo "Checking all timestamp-based worktrees"
echo ""

FRESH_COUNT=0
STALE_COUNT=0
TOTAL_AGENTS=0

for dir in /home/codingbutter/GitHub/team-dashboard-worktrees/agent-*/; do
    if [ -d "$dir" ]; then
        ((TOTAL_AGENTS++))
        dirname=$(basename "$dir")
        
        echo "📦 Agent Workspace: $dirname"
        cd "$dir" 2>/dev/null && {
            branch=$(git branch --show-current)
            echo "   🌿 Branch: $branch"
            
            # Check if follows fresh naming convention
            if [[ "$dirname" =~ agent-.*-[0-9]{13} ]]; then
                echo "   ✅ Fresh worktree naming convention"
                ((FRESH_COUNT++))
                
                # Extract and show creation time
                timestamp=$(echo "$dirname" | grep -o '[0-9]\{13\}$')
                if [ -n "$timestamp" ]; then
                    creation_date=$(date -d "@$((timestamp / 1000))" 2>/dev/null || echo "unknown")
                    echo "   📅 Created: $creation_date"
                fi
            else
                echo "   ⚠️  NOT following fresh naming convention"
                ((STALE_COUNT++))
            fi
            
            # Show work status
            echo "   📊 Work Status:"
            git status --short | head -3 | sed 's/^/      /'
            
            # Show commits
            commit_count=$(git log development..HEAD --oneline 2>/dev/null | wc -l)
            echo "   📝 Commits ahead of development: $commit_count"
            
            # Check if AGENT_INSTRUCTIONS.md exists
            if [ -f "AGENT_INSTRUCTIONS.md" ]; then
                echo "   📋 Has agent instructions ✅"
            else
                echo "   📋 Missing agent instructions ⚠️"
            fi
        }
        echo ""
    fi
done

echo "📊 Fresh Worktree Summary:"
echo "  Total agents: $TOTAL_AGENTS"
echo "  Fresh worktrees: $FRESH_COUNT"
echo "  Non-fresh worktrees: $STALE_COUNT"

if [ $STALE_COUNT -gt 0 ]; then
    echo ""
    echo "⚠️  Warning: $STALE_COUNT worktrees do not follow fresh naming convention"
    echo "   Run worktree-cleanup.sh to clean up stale worktrees"
fi

echo ""
echo "📈 Deployment Activity:"
if [ -f "/home/codingbutter/GitHub/team-dashboard-worktrees/deployment.log" ]; then
    echo "Recent deployments:"
    tail -5 "/home/codingbutter/GitHub/team-dashboard-worktrees/deployment.log" | sed 's/^/   /'
else
    echo "   No deployment log found"
fi

echo ""
echo "🔄 Fresh Worktree Health Check:"
./services/agent-manager/scripts/validate-worktree-freshness.sh --summary 2>/dev/null || echo "   Run validate-worktree-freshness.sh for detailed health check"
MONITOR_EOF

chmod +x "$BASE_DIR/monitor-fresh-agents.sh"

echo ""
echo "🎯 Fresh Worktree Management Tools Created:"
echo "  📊 Monitor: $BASE_DIR/monitor-fresh-agents.sh"
echo "  🧹 Cleanup: ./services/agent-manager/scripts/worktree-cleanup.sh"  
echo "  ✅ Validate: ./services/agent-manager/scripts/validate-worktree-freshness.sh"
echo ""
echo "💡 Quick Commands:"
echo "  Monitor agents: $BASE_DIR/monitor-fresh-agents.sh"
echo "  Clean up stale: ./services/agent-manager/scripts/worktree-cleanup.sh"
echo "  Validate health: ./services/agent-manager/scripts/validate-worktree-freshness.sh"