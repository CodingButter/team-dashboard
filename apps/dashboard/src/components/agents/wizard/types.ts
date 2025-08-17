/**
 * @package dashboard/components/agents/wizard
 * Shared types and interfaces for the agent creation wizard
 */

import { AgentConfiguration, SystemPrompt, MCPServer, AgentModel } from '@team-dashboard/types';

export type WizardStep = 'basic' | 'model' | 'prompt' | 'mcp' | 'permissions' | 'review';

export interface WizardStepInfo {
  key: WizardStep;
  title: string;
  description: string;
}

export interface AgentCreationWizardProps {
  onCreateAgent: (config: AgentConfiguration) => void;
  onCancel: () => void;
  systemPrompts: SystemPrompt[];
  mcpServers: MCPServer[];
  isCreating?: boolean;
}

export interface StepComponentProps {
  config: Partial<AgentConfiguration>;
  updateConfig: (updates: Partial<AgentConfiguration>) => void;
  systemPrompts: SystemPrompt[];
  mcpServers: MCPServer[];
  onNext: () => void;
  onPrevious: () => void;
  canProceed: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export interface ModelOption {
  model: AgentModel;
  name: string;
  description: string;
  provider: string;
}

export interface PermissionLevel {
  level: 'restrictive' | 'moderate' | 'permissive';
  name: string;
  description: string;
  features: string[];
}