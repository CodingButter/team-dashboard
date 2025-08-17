/**
 * @package dashboard/components/agents/wizard
 * Basic information step for agent creation wizard
 */

import React from 'react';
import { StepComponentProps } from './types';

export function BasicInfoStep({
  config,
  updateConfig,
  onNext,
  canProceed,
  isLast
}: StepComponentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Basic Agent Information
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Start by giving your agent a name and defining its primary role.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name *
          </label>
          <input
            id="agent-name"
            type="text"
            value={config.name || ''}
            onChange={(e) => updateConfig({ name: e.target.value })}
            placeholder="e.g., Data Analysis Assistant"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Choose a descriptive name that reflects the agent's purpose
          </p>
        </div>

        <div>
          <label htmlFor="agent-role" className="block text-sm font-medium text-gray-700 mb-2">
            Primary Role *
          </label>
          <select
            id="agent-role"
            value={config.role || ''}
            onChange={(e) => updateConfig({ role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a role...</option>
            <option value="assistant">General Assistant</option>
            <option value="analyst">Data Analyst</option>
            <option value="developer">Code Developer</option>
            <option value="researcher">Researcher</option>
            <option value="writer">Content Writer</option>
            <option value="support">Customer Support</option>
            <option value="specialist">Domain Specialist</option>
            <option value="custom">Custom Role</option>
          </select>
        </div>

        {config.role === 'custom' && (
          <div>
            <label htmlFor="custom-role" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Role Description
            </label>
            <input
              id="custom-role"
              type="text"
              value={config.customRole || ''}
              onChange={(e) => updateConfig({ customRole: e.target.value })}
              placeholder="Describe the custom role..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="agent-description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="agent-description"
            rows={3}
            value={config.description || ''}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="Brief description of what this agent does..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional description to help team members understand this agent's purpose
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-md font-medium ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLast ? 'Create Agent' : 'Next Step'}
        </button>
      </div>
    </div>
  );
}