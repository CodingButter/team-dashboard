# URGENT: TypeScript Build Fix Required

## Assigned To: **code-quality-refactoring-specialist**

## Priority: **P0 - Blocking Development Branch**

## Issue Summary
The development branch build is failing due to TypeScript errors in the agent-manager service. This is blocking all development work.

## Technical Details

### Build Error Location
- **Service**: `services/agent-manager`
- **Command**: `pnpm build` fails with TypeScript compilation errors

### Specific Errors to Fix

1. **agent-lifecycle.ts**:
   - Line 8: Unused import `AgentProcess`
   - Line 9: Unused import `AgentSpawnConfig` 
   - Line 11: Unused import `ResourceUsage`
   - Line 160: Unused parameter `reason`
   - Line 303: Type mismatch - missing `ready`, `spawned`, `exited` properties

2. **event-logger.ts**:
   - Line 11: Unused import `AgentProcessEventData`
   - Line 195: Type mismatch - missing `ready`, `spawned`, `exited` properties

3. **health-monitor.ts**:
   - Line 12: Unused import `AgentStatus`
   - Line 236, 284, 333: Unused parameters `agentId`
   - Line 276, 325, 381: Unknown error types need typing

4. **resource-monitor.ts**:
   - Line 9: Unused import `path`
   - Line 420: Unused variable `stats`

5. **lifecycle/index.ts**:
   - Line 11: Unused import `ResourceLimits`

## Root Cause
The AgentStatus type in `/packages/types/src/api/common.ts` defines:
```typescript
export type AgentStatus = 'starting' | 'idle' | 'busy' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error' | 'crashed' | 'terminated' | 'ready' | 'spawned' | 'exited';
```

But the lifecycle mappings are missing the `ready`, `spawned`, `exited` status values.

## Required Actions

1. **Fix unused imports**: Remove or use all unused TypeScript imports
2. **Fix type mismatches**: Update Record types to include all AgentStatus values
3. **Fix error typing**: Add proper typing for unknown error objects
4. **Fix unused parameters**: Remove or use unused function parameters
5. **Verify build**: Ensure `pnpm build` passes completely

## Success Criteria
- [ ] `pnpm build` completes without TypeScript errors
- [ ] All agent-manager service files compile successfully
- [ ] No unused imports or variables remain
- [ ] All type mappings include complete AgentStatus coverage

## Working Directory
- **Main Repo**: `/home/codingbutter/GitHub/team-dashboard` (development branch)
- **Create Fresh Worktree**: Required for this work

## Timeline
**URGENT** - This is blocking all development work. Complete within 2 hours.

## Notes
- This is purely a TypeScript configuration and type fixing task
- No functional changes required, only type safety compliance
- Critical for enabling other agents to continue development work