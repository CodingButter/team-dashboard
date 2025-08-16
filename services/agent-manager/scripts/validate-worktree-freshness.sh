#!/bin/bash

# Worktree Freshness Validation Script
# Ensures all active agents are using fresh, unique worktrees
# Usage: ./validate-worktree-freshness.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WORKTREE_BASE="/home/codingbutter/GitHub/team-dashboard-worktrees"

echo "🔍 Validating worktree freshness..."
echo "📁 Repository root: $REPO_ROOT"
echo "📁 Worktree base: $WORKTREE_BASE"

cd "$REPO_ROOT"

# Get current worktrees
WORKTREES=$(git worktree list | grep "$WORKTREE_BASE" || true)

if [[ -z "$WORKTREES" ]]; then
    echo "✅ No worktrees found - system is clean"
    exit 0
fi

echo ""
echo "📋 Current worktrees:"
WORKTREE_COUNT=0
STALE_COUNT=0
FRESH_COUNT=0

# Check each worktree for freshness indicators
while IFS= read -r worktree_line; do
    ((WORKTREE_COUNT++))
    
    # Extract worktree path and branch
    WORKTREE_PATH=$(echo "$worktree_line" | awk '{print $1}')
    BRANCH_INFO=$(echo "$worktree_line" | grep -o '\[.*\]' | tr -d '[]' || echo "no-branch")
    
    echo ""
    echo "🔍 Analyzing worktree $WORKTREE_COUNT:"
    echo "    Path: $WORKTREE_PATH"
    echo "    Branch: $BRANCH_INFO"
    
    # Check if path follows fresh worktree naming convention
    if [[ "$WORKTREE_PATH" =~ agent-.*-[0-9]{13} ]]; then
        echo "    ✅ Path follows fresh worktree naming convention"
        
        # Extract timestamp from path
        TIMESTAMP=$(echo "$WORKTREE_PATH" | grep -o '[0-9]\{13\}$')
        if [[ -n "$TIMESTAMP" ]]; then
            # Convert timestamp to human readable
            CREATION_DATE=$(date -d "@$((TIMESTAMP / 1000))" 2>/dev/null || echo "unknown")
            echo "    📅 Created: $CREATION_DATE"
            
            # Check if worktree is very old (> 7 days)
            CURRENT_TIME=$(date +%s)
            WORKTREE_TIME=$((TIMESTAMP / 1000))
            AGE_DAYS=$(( (CURRENT_TIME - WORKTREE_TIME) / 86400 ))
            
            if [[ $AGE_DAYS -gt 7 ]]; then
                echo "    ⚠️  STALE: Worktree is $AGE_DAYS days old"
                ((STALE_COUNT++))
            else
                echo "    ✅ FRESH: Worktree is $AGE_DAYS days old"
                ((FRESH_COUNT++))
            fi
        else
            echo "    ⚠️  Could not extract timestamp"
            ((STALE_COUNT++))
        fi
    else
        echo "    ❌ VIOLATION: Path does not follow fresh worktree naming convention"
        echo "    📏 Expected pattern: agent-{name}-{timestamp}"
        ((STALE_COUNT++))
    fi
    
    # Check if branch follows convention
    if [[ "$BRANCH_INFO" =~ feature/.+-[0-9]{13} ]] || [[ "$BRANCH_INFO" =~ feature/.+ ]]; then
        echo "    ✅ Branch follows naming convention"
    else
        echo "    ⚠️  Branch does not follow expected pattern: feature/{name}-{timestamp}"
    fi
    
    # Check if worktree directory actually exists
    if [[ -d "$WORKTREE_PATH" ]]; then
        echo "    ✅ Worktree directory exists"
        
        # Check if it has .git file (worktree indicator)
        if [[ -f "$WORKTREE_PATH/.git" ]]; then
            echo "    ✅ Valid git worktree structure"
        else
            echo "    ❌ Missing .git file - invalid worktree"
        fi
    else
        echo "    ❌ Worktree directory does not exist"
    fi
    
done <<< "$WORKTREES"

echo ""
echo "📊 Validation Summary:"
echo "  - Total worktrees: $WORKTREE_COUNT"
echo "  - Fresh worktrees: $FRESH_COUNT"
echo "  - Stale worktrees: $STALE_COUNT"

if [[ $STALE_COUNT -gt 0 ]]; then
    echo ""
    echo "⚠️  RECOMMENDATIONS:"
    echo "  1. Run worktree cleanup script to remove stale worktrees"
    echo "  2. Ensure agent spawning always creates fresh worktrees"
    echo "  3. Review worktree creation process for violations"
    echo ""
    echo "🧹 To clean up stale worktrees:"
    echo "  ./worktree-cleanup.sh --dry-run  # Preview changes"
    echo "  ./worktree-cleanup.sh           # Actually clean up"
    
    exit 1
else
    echo ""
    echo "✅ All worktrees are fresh and properly configured"
    exit 0
fi