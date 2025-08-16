'use client'

import React, { useState, useCallback } from 'react'

export interface AutoApprovalRule {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: {
    toolNames?: string[]
    riskLevels?: ('low' | 'medium' | 'high' | 'critical')[]
    agentIds?: string[]
    timeWindow?: {
      start: string // HH:MM format
      end: string   // HH:MM format
    }
    maxRequests?: {
      count: number
      period: 'hour' | 'day' | 'week'
    }
  }
  actions: {
    autoApprove: boolean
    autoDeny: boolean
    requireAdditionalApproval?: boolean
    notifyUsers?: string[]
  }
  createdAt: number
  updatedAt: number
  createdBy: string
}

interface AutoApprovalRulesProps {
  rules: AutoApprovalRule[]
  onSaveRule: (rule: Omit<AutoApprovalRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void
  onUpdateRule: (id: string, rule: Partial<AutoApprovalRule>) => void
  onDeleteRule: (id: string) => void
  onToggleRule: (id: string, enabled: boolean) => void
}

const defaultRule: Omit<AutoApprovalRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  name: '',
  description: '',
  enabled: true,
  conditions: {},
  actions: {
    autoApprove: false,
    autoDeny: false
  }
}

export function AutoApprovalRules({
  rules,
  onSaveRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule
}: AutoApprovalRulesProps) {
  const [editingRule, setEditingRule] = useState<AutoApprovalRule | null>(null)
  const [newRule, setNewRule] = useState(defaultRule)
  const [showNewRuleForm, setShowNewRuleForm] = useState(false)

  const handleSaveNewRule = useCallback(() => {
    if (newRule.name.trim()) {
      onSaveRule(newRule)
      setNewRule(defaultRule)
      setShowNewRuleForm(false)
    }
  }, [newRule, onSaveRule])

  const handleUpdateRule = useCallback((rule: AutoApprovalRule) => {
    onUpdateRule(rule.id, rule)
    setEditingRule(null)
  }, [onUpdateRule])

  const formatTimeWindow = (timeWindow?: { start: string; end: string }) => {
    if (!timeWindow) return 'Any time'
    return `${timeWindow.start} - ${timeWindow.end}`
  }

  const formatMaxRequests = (maxRequests?: { count: number; period: string }) => {
    if (!maxRequests) return 'No limit'
    return `${maxRequests.count} per ${maxRequests.period}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Auto-Approval Rules</h2>
        <button
          onClick={() => setShowNewRuleForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Add Rule
        </button>
      </div>

      {/* New Rule Form */}
      {showNewRuleForm && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-foreground">Create New Rule</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Rule Name
              </label>
              <input
                type="text"
                value={newRule.name}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="e.g., Safe File Operations"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <input
                type="text"
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                placeholder="Describe when this rule applies"
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-foreground">Conditions</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tool Names (comma-separated)
                </label>
                <input
                  type="text"
                  value={newRule.conditions.toolNames?.join(', ') || ''}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      toolNames: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }
                  }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  placeholder="e.g., file_read, file_write"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Risk Levels
                </label>
                <div className="flex flex-wrap gap-2">
                  {['low', 'medium', 'high', 'critical'].map(level => (
                    <label key={level} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newRule.conditions.riskLevels?.includes(level as any) || false}
                        onChange={(e) => {
                          const levels = newRule.conditions.riskLevels || []
                          const newLevels = e.target.checked
                            ? [...levels, level as any]
                            : levels.filter(l => l !== level)
                          setNewRule(prev => ({
                            ...prev,
                            conditions: {
                              ...prev.conditions,
                              riskLevels: newLevels
                            }
                          }))
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground capitalize">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-foreground">Actions</h4>
            
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="action"
                  checked={newRule.actions.autoApprove}
                  onChange={() => setNewRule(prev => ({
                    ...prev,
                    actions: { ...prev.actions, autoApprove: true, autoDeny: false }
                  }))}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Auto-approve</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="action"
                  checked={newRule.actions.autoDeny}
                  onChange={() => setNewRule(prev => ({
                    ...prev,
                    actions: { ...prev.actions, autoApprove: false, autoDeny: true }
                  }))}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Auto-deny</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newRule.actions.requireAdditionalApproval || false}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    actions: { ...prev.actions, requireAdditionalApproval: e.target.checked }
                  }))}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Require additional approval</span>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSaveNewRule}
              disabled={!newRule.name.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-md transition-colors"
            >
              Save Rule
            </button>
            <button
              onClick={() => {
                setShowNewRuleForm(false)
                setNewRule(defaultRule)
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="text-muted-foreground">
              No auto-approval rules configured.
            </div>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-foreground">{rule.name}</h3>
                    <div className={`px-2 py-1 text-xs rounded ${
                      rule.enabled 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-foreground">Tools: </span>
                      <span className="text-muted-foreground">
                        {rule.conditions.toolNames?.join(', ') || 'Any'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="font-medium text-foreground">Risk Levels: </span>
                      <span className="text-muted-foreground">
                        {rule.conditions.riskLevels?.join(', ') || 'Any'}
                      </span>
                    </div>
                    
                    <div>
                      <span className="font-medium text-foreground">Action: </span>
                      <span className={`${
                        rule.actions.autoApprove ? 'text-green-400' : 
                        rule.actions.autoDeny ? 'text-red-400' : 'text-muted-foreground'
                      }`}>
                        {rule.actions.autoApprove ? 'Auto-approve' : 
                         rule.actions.autoDeny ? 'Auto-deny' : 'Manual review'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(rule.createdAt).toLocaleDateString()} by {rule.createdBy}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onToggleRule(rule.id, !rule.enabled)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      rule.enabled
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                    }`}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 rounded transition-colors"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}