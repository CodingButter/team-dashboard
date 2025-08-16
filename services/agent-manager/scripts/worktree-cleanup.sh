#!/bin/bash

# Worktree Cleanup Script for Project Manager
# Removes worktrees for branches that have been merged to development
# Usage: ./worktree-cleanup.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WORKTREE_BASE="/home/codingbutter/GitHub/team-dashboard-worktrees"

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No changes will be made"
fi

echo "🧹 Starting worktree cleanup process..."
echo "📁 Repository root: $REPO_ROOT"
echo "📁 Worktree base: $WORKTREE_BASE"

cd "$REPO_ROOT"

# Get list of merged branches
echo "🔍 Finding branches merged to development..."
MERGED_BRANCHES=$(git branch -r --merged development | grep -v 'origin/development' | grep -v 'origin/main' | sed 's/origin\///' | xargs)

if [[ -z "$MERGED_BRANCHES" ]]; then
    echo "✅ No merged branches found that need cleanup"
    exit 0
fi

echo "📋 Merged branches found:"
for branch in $MERGED_BRANCHES; do
    echo "  - $branch"
done

# Get current worktrees
echo ""
echo "🔍 Checking current worktrees..."
WORKTREES=$(git worktree list | grep "$WORKTREE_BASE" || true)

if [[ -z "$WORKTREES" ]]; then
    echo "✅ No worktrees found in $WORKTREE_BASE"
    exit 0
fi

echo "📋 Current worktrees:"
while IFS= read -r line; do
    echo "  $line"
done <<< "$WORKTREES"

echo ""
echo "🧹 Cleaning up worktrees for merged branches..."

CLEANED_COUNT=0

# Process each worktree
while IFS= read -r worktree_line; do
    # Extract worktree path and branch
    WORKTREE_PATH=$(echo "$worktree_line" | awk '{print $1}')
    BRANCH_INFO=$(echo "$worktree_line" | grep -o '\[.*\]' | tr -d '[]')
    
    if [[ -z "$BRANCH_INFO" ]]; then
        echo "⚠️  Skipping worktree with no branch info: $WORKTREE_PATH"
        continue
    fi
    
    # Check if this branch is in the merged list
    BRANCH_MERGED=false
    for merged_branch in $MERGED_BRANCHES; do
        if [[ "$BRANCH_INFO" == "$merged_branch" ]] || [[ "$BRANCH_INFO" == "feature/"*"$merged_branch"* ]]; then
            BRANCH_MERGED=true
            break
        fi
    done
    
    if [[ "$BRANCH_MERGED" == true ]]; then
        echo "🗑️  Cleaning up worktree for merged branch: $BRANCH_INFO"
        echo "    Path: $WORKTREE_PATH"
        
        if [[ "$DRY_RUN" == false ]]; then
            # Remove the worktree
            git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || {
                echo "⚠️  Failed to remove worktree, trying manual cleanup..."
                rm -rf "$WORKTREE_PATH" 2>/dev/null || true
                git worktree prune 2>/dev/null || true
            }
            
            # Delete the branch if it exists locally
            git branch -D "$BRANCH_INFO" 2>/dev/null || true
            
            echo "    ✅ Cleaned up worktree and branch"
            ((CLEANED_COUNT++))
        else
            echo "    🔍 [DRY RUN] Would remove worktree and branch"
            ((CLEANED_COUNT++))
        fi
    else
        echo "ℹ️  Keeping worktree for active branch: $BRANCH_INFO"
    fi
    
done <<< "$WORKTREES"

echo ""
echo "📊 Cleanup Summary:"
echo "  - Worktrees cleaned: $CLEANED_COUNT"

if [[ "$DRY_RUN" == true ]]; then
    echo "🔍 This was a dry run. To actually clean up, run without --dry-run"
else
    echo "✅ Worktree cleanup completed successfully"
    
    # Prune any remaining references
    git worktree prune
    echo "🧹 Pruned stale worktree references"
fi

echo ""
echo "🏁 Worktree cleanup process finished"