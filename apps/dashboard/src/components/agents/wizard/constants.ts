/**
 * @package dashboard/components/agents/wizard
 * Constants and configuration data for the agent creation wizard
 */

import { ModelOption, PermissionLevel, WizardStepInfo } from './types';

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    model: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable OpenAI model with multimodal capabilities',
    provider: 'OpenAI'
  },
  {
    model: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and efficient model for most tasks',
    provider: 'OpenAI'
  },
  {
    model: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Advanced reasoning with large context window',
    provider: 'OpenAI'
  },
  {
    model: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: 'Most powerful Claude model for complex tasks',
    provider: 'Anthropic'
  },
  {
    model: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and speed',
    provider: 'Anthropic'
  },
  {
    model: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast and cost-effective for simple tasks',
    provider: 'Anthropic'
  }
];

export const WIZARD_STEPS: WizardStepInfo[] = [
  { key: 'basic', title: 'Basic Info', description: 'Name and role' },
  { key: 'model', title: 'AI Model', description: 'Choose model' },
  { key: 'prompt', title: 'System Prompt', description: 'Behavior setup' },
  { key: 'mcp', title: 'MCP Servers', description: 'Tool access' },
  { key: 'permissions', title: 'Permissions', description: 'Security settings' },
  { key: 'review', title: 'Review', description: 'Final check' }
];

export const PERMISSION_LEVELS: PermissionLevel[] = [
  {
    level: 'restrictive',
    name: 'Restrictive',
    description: 'High security, limited tool access',
    features: [
      'Manual approval for all tools',
      'Read-only file access',
      'No external network requests',
      'Limited memory usage'
    ]
  },
  {
    level: 'moderate',
    name: 'Moderate',
    description: 'Balanced security and functionality',
    features: [
      'Auto-approve safe tools',
      'Read/write to designated folders',
      'Approved external APIs only',
      'Standard memory limits'
    ]
  },
  {
    level: 'permissive',
    name: 'Permissive',
    description: 'Maximum functionality, use with caution',
    features: [
      'Auto-approve most tools',
      'Full filesystem access',
      'Unrestricted network access',
      'Extended memory limits'
    ]
  }
];