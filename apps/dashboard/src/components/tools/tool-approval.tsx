'use client'

import React, { useState, useCallback } from 'react'
import { ToolApprovalRequest, ToolExecution } from '@team-dashboard/types'

interface ToolApprovalProps {
  request: ToolApprovalRequest
  onApprove: (requestId: string, reasoning?: string) => void
  onDeny: (requestId: string, reasoning?: string) => void
  onIgnore?: (requestId: string) => void
  isProcessing?: boolean
}

interface RiskIndicatorProps {
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
}

function RiskIndicator({ level, factors }: RiskIndicatorProps) {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center px-3 py-1 text-sm rounded-full border ${getRiskColor(level)}`}>
        <span className="mr-2">{getRiskIcon(level)}</span>
        <span className="font-medium">{level.toUpperCase()} RISK</span>
      </div>
      
      {factors.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">Risk Factors:</div>
          <ul className="space-y-1">
            {factors.map((factor, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start">
                <span className="text-red-400 mr-2">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CommandPreview({ input, toolName }: { input: any, toolName: string }) {
  const formatInput = (input: any): string => {
    if (typeof input === 'string') return input
    if (typeof input === 'object') {
      return JSON.stringify(input, null, 2)
    }
    return String(input)
  }

  const getCommandPreview = (toolName: string, input: any): string => {
    // Generate human-readable preview based on tool name and input
    switch (toolName.toLowerCase()) {
      case 'bash':
      case 'shell':
      case 'terminal':
        return input.command || formatInput(input)
      case 'file_write':
      case 'write_file':
        return `Write to: ${input.path || input.file_path || 'unknown'}`
      case 'file_delete':
      case 'delete_file':
        return `Delete: ${input.path || input.file_path || 'unknown'}`
      case 'git':
        return `Git: ${input.command || formatInput(input)}`
      case 'npm':
      case 'yarn':
      case 'pnpm':
        return `${toolName}: ${input.command || formatInput(input)}`
      default:
        return formatInput(input)
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">Command Preview:</div>
      <div className="bg-black border border-border rounded-md p-3 font-mono text-sm">
        <div className="text-green-400 mb-1">$ {toolName}</div>
        <div className="text-white whitespace-pre-wrap">
          {getCommandPreview(toolName, input)}
        </div>
      </div>
    </div>
  )
}

export function ToolApproval({ 
  request, 
  onApprove, 
  onDeny, 
  onIgnore,
  isProcessing = false 
}: ToolApprovalProps) {
  const [reasoning, setReasoning] = useState('')
  const [showFullInput, setShowFullInput] = useState(false)

  const handleApprove = useCallback(() => {
    onApprove(request.id, reasoning.trim() || undefined)
    setReasoning('')
  }, [request.id, reasoning, onApprove])

  const handleDeny = useCallback(() => {
    onDeny(request.id, reasoning.trim() || undefined)
    setReasoning('')
  }, [request.id, reasoning, onDeny])

  const handleIgnore = useCallback(() => {
    onIgnore?.(request.id)
  }, [request.id, onIgnore])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getDangerousPatterns = (toolName: string, input: any): string[] => {
    const patterns: string[] = []
    const inputStr = JSON.stringify(input).toLowerCase()

    // Check for dangerous file operations
    if (inputStr.includes('rm -rf') || inputStr.includes('rmdir /s')) {
      patterns.push('Recursive file deletion detected')
    }

    // Check for system modification
    if (inputStr.includes('sudo') || inputStr.includes('admin')) {
      patterns.push('Elevated privileges required')
    }

    // Check for network operations
    if (inputStr.includes('curl') || inputStr.includes('wget') || inputStr.includes('http')) {
      patterns.push('Network operations detected')
    }

    // Check for package installation
    if (inputStr.includes('install') || inputStr.includes('npm i') || inputStr.includes('pip install')) {
      patterns.push('Package installation detected')
    }

    // Check for file system root access
    if (inputStr.includes('c:\\') || inputStr.includes('/etc/') || inputStr.includes('/root/')) {
      patterns.push('System directory access')
    }

    return patterns
  }

  const dangerousPatterns = getDangerousPatterns(request.toolName, request.input)

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Tool Approval Required
          </h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Tool: <span className="font-mono text-foreground">{request.toolName}</span></span>
            <span>Agent: <span className="text-foreground">{request.agentName}</span></span>
            <span>Requested: {formatTimestamp(request.requestedAt)}</span>
          </div>
        </div>
        
        {isProcessing && (
          <div className="text-sm text-yellow-400">Processing...</div>
        )}
      </div>

      {/* Risk Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Risk Assessment</h4>
          <RiskIndicator level={request.riskLevel} factors={request.riskFactors} />
          
          {dangerousPatterns.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-orange-400">Detected Patterns:</div>
              <ul className="space-y-1">
                {dangerousPatterns.map((pattern, index) => (
                  <li key={index} className="text-sm text-orange-300 flex items-start">
                    <span className="text-orange-400 mr-2">⚠️</span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-md font-medium text-foreground">Context</h4>
          
          {request.context && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Agent Context:</div>
              <div className="text-sm text-muted-foreground bg-background border border-border rounded p-3">
                {request.context}
              </div>
            </div>
          )}
          
          {request.workingDirectory && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Working Directory:</div>
              <div className="text-sm font-mono text-foreground bg-background border border-border rounded p-2">
                {request.workingDirectory}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Command Details */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-foreground">Command Details</h4>
        
        <CommandPreview input={request.input} toolName={request.toolName} />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Raw Input:</div>
            <button
              onClick={() => setShowFullInput(!showFullInput)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showFullInput ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {showFullInput && (
            <div className="bg-background border border-border rounded p-3 font-mono text-sm">
              <pre className="whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(request.input, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Approval Reasoning (Optional)
        </label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
          rows={3}
          placeholder="Explain why you're approving or denying this request..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex space-x-3">
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-md transition-colors flex items-center space-x-2"
          >
            <span>✓</span>
            <span>Approve</span>
          </button>
          
          <button
            onClick={handleDeny}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-md transition-colors flex items-center space-x-2"
          >
            <span>✗</span>
            <span>Deny</span>
          </button>
          
          {onIgnore && (
            <button
              onClick={handleIgnore}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600/50 text-white rounded-md transition-colors"
            >
              Ignore
            </button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Request ID: {request.id}
        </div>
      </div>
    </div>
  )
}

interface ToolApprovalQueueProps {
  requests: ToolApprovalRequest[]
  onApprove: (requestId: string, reasoning?: string) => void
  onDeny: (requestId: string, reasoning?: string) => void
  onIgnore?: (requestId: string) => void
  processingRequestIds?: string[]
}

export function ToolApprovalQueue({ 
  requests, 
  onApprove, 
  onDeny, 
  onIgnore,
  processingRequestIds = [] 
}: ToolApprovalQueueProps) {
  const sortedRequests = [...requests].sort((a, b) => {
    // Sort by risk level (critical first), then by timestamp
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const aRisk = riskOrder[a.riskLevel] ?? 4
    const bRisk = riskOrder[b.riskLevel] ?? 4
    
    if (aRisk !== bRisk) return aRisk - bRisk
    return b.requestedAt - a.requestedAt
  })

  if (requests.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <div className="text-muted-foreground">
          No pending tool approval requests
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Tool Approval Queue ({requests.length})
        </h2>
        
        <div className="flex items-center space-x-4 text-sm">
          {['critical', 'high', 'medium', 'low'].map(level => {
            const count = requests.filter(r => r.riskLevel === level).length
            if (count === 0) return null
            
            const colors = {
              critical: 'text-red-400',
              high: 'text-orange-400', 
              medium: 'text-yellow-400',
              low: 'text-green-400'
            }
            
            return (
              <span key={level} className={colors[level as keyof typeof colors]}>
                {count} {level}
              </span>
            )
          })}
        </div>
      </div>
      
      {sortedRequests.map(request => (
        <ToolApproval
          key={request.id}
          request={request}
          onApprove={onApprove}
          onDeny={onDeny}
          onIgnore={onIgnore}
          isProcessing={processingRequestIds.includes(request.id)}
        />
      ))}
    </div>
  )
}