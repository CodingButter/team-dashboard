/**
 * Session & State Management Models
 * Classes for dashboard sessions and user preferences
 */

import { AgentConnection } from './agent-connection';
import { UserPreferences } from '../api/auth';

/**
 * Dashboard session state
 */
export class DashboardSession {
  public readonly id: string;
  public readonly userId: string;
  public readonly createdAt: Date;
  public lastActivity: Date;
  public agents: Map<string, AgentConnection> = new Map();
  public subscriptions: Set<string> = new Set();
  public preferences: UserPreferences;
  
  constructor(userId: string, preferences?: Partial<UserPreferences>) {
    this.id = generateId();
    this.userId = userId;
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.preferences = {
      theme: 'dark',
      terminalFont: 'monospace',
      terminalFontSize: 14,
      shortcuts: defaultShortcuts(),
      defaultWorkspace: '/workspace',
      autoSaveSession: true,
      ...preferences
    };
  }
  
  /**
   * Add agent to session
   */
  addAgent(agent: AgentConnection): void {
    this.agents.set(agent.id, agent);
    this.lastActivity = new Date();
  }
  
  /**
   * Remove agent from session
   */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.lastActivity = new Date();
  }
  
  /**
   * Export session state for persistence
   */
  export(): any {
    return {
      id: this.id,
      userId: this.userId,
      createdAt: this.createdAt.toISOString(),
      agents: Array.from(this.agents.values()).map(a => ({
        id: a.id,
        name: a.name,
        model: a.model,
        workspace: a.workspace,
        status: a.status
      })),
      subscriptions: Array.from(this.subscriptions),
      preferences: this.preferences
    };
  }
}

// Helper Functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function defaultShortcuts(): Record<string, string> {
  return {
    'escape': 'agent:stop',
    'ctrl+c': 'agent:interrupt',
    'ctrl+l': 'terminal:clear',
    'ctrl+tab': 'agent:next',
    'ctrl+shift+tab': 'agent:previous',
    'ctrl+n': 'agent:create',
    'ctrl+w': 'agent:close',
    'ctrl+s': 'session:save',
    'ctrl+r': 'session:restore'
  };
}