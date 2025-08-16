'use client'

import React, { useState, useMemo } from 'react'

export interface ApprovalAuditEntry {
  id: string
  requestId: string
  toolName: string
  agentId: string
  agentName: string
  action: 'approved' | 'denied' | 'ignored' | 'auto_approved' | 'auto_denied'
  decision: 'approved' | 'denied' | 'ignored'
  reasoning?: string
  approvedBy?: string
  deniedBy?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  timestamp: number
  responseTime: number // seconds
  input: any
  output?: any
  errorMessage?: string
  batchId?: string // If part of batch operation
  autoRule?: {
    id: string
    name: string
  }
}

interface ApprovalAuditTrailProps {
  entries: ApprovalAuditEntry[]
  onExport?: () => void
  onFilter?: (filters: AuditFilters) => void
}

interface AuditFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  action?: string
  riskLevel?: string
  agentId?: string
  toolName?: string
  searchTerm?: string
}

export function ApprovalAuditTrail({
  entries,
  onExport,
  onFilter
}: ApprovalAuditTrailProps) {
  const [filters, setFilters] = useState<AuditFilters>({})
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof ApprovalAuditEntry>('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries

    // Apply filters
    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action)
    }
    if (filters.riskLevel) {
      filtered = filtered.filter(entry => entry.riskLevel === filters.riskLevel)
    }
    if (filters.agentId) {
      filtered = filtered.filter(entry => entry.agentId === filters.agentId)
    }
    if (filters.toolName) {
      filtered = filtered.filter(entry => entry.toolName.includes(filters.toolName))
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(entry =>
        entry.reasoning?.toLowerCase().includes(term) ||
        entry.toolName.toLowerCase().includes(term) ||
        entry.agentName.toLowerCase().includes(term) ||
        JSON.stringify(entry.input).toLowerCase().includes(term)
      )
    }
    if (filters.dateRange) {
      filtered = filtered.filter(entry =>
        entry.timestamp >= filters.dateRange!.start.getTime() &&
        entry.timestamp <= filters.dateRange!.end.getTime()
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [entries, filters, sortField, sortDirection])

  const handleSort = (field: keyof ApprovalAuditEntry) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilter?.(newFilters)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved': return '✅'
      case 'denied': return '❌'
      case 'ignored': return '⏭️'
      case 'auto_approved': return '🤖✅'
      case 'auto_denied': return '🤖❌'
      default: return '❓'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved':
      case 'auto_approved':
        return 'text-green-400 bg-green-400/10'
      case 'denied':
      case 'auto_denied':
        return 'text-red-400 bg-red-400/10'
      case 'ignored':
        return 'text-gray-400 bg-gray-400/10'
      default:
        return 'text-muted-foreground bg-background'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-orange-400'
      case 'critical': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const uniqueAgents = [...new Set(entries.map(e => ({ id: e.agentId, name: e.agentName })))]
  const uniqueTools = [...new Set(entries.map(e => e.toolName))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Approval Audit Trail</h2>
        
        <div className="flex space-x-3">
          {onExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center space-x-2"
            >
              <span>📊</span>
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-foreground">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">All Actions</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="ignored">Ignored</option>
              <option value="auto_approved">Auto-Approved</option>
              <option value="auto_denied">Auto-Denied</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Risk Level</label>
            <select
              value={filters.riskLevel || ''}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">All Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Agent</label>
            <select
              value={filters.agentId || ''}
              onChange={(e) => handleFilterChange('agentId', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">All Agents</option>
              {uniqueAgents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tool</label>
            <select
              value={filters.toolName || ''}
              onChange={(e) => handleFilterChange('toolName', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
            >
              <option value="">All Tools</option>
              {uniqueTools.map(tool => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Search</label>
            <input
              type="text"
              value={filters.searchTerm || ''}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              placeholder="Search..."
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({})}
              className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{filteredAndSortedEntries.length}</div>
          <div className="text-sm text-muted-foreground">Total Entries</div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {filteredAndSortedEntries.filter(e => e.decision === 'approved').length}
          </div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            {filteredAndSortedEntries.filter(e => e.decision === 'denied').length}
          </div>
          <div className="text-sm text-muted-foreground">Denied</div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {Math.round(filteredAndSortedEntries.reduce((sum, e) => sum + e.responseTime, 0) / filteredAndSortedEntries.length || 0)}s
          </div>
          <div className="text-sm text-muted-foreground">Avg Response</div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('timestamp')}
                    className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-blue-400"
                  >
                    <span>Timestamp</span>
                    {sortField === 'timestamp' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('toolName')}
                    className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-blue-400"
                  >
                    <span>Tool</span>
                    {sortField === 'toolName' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('agentName')}
                    className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-blue-400"
                  >
                    <span>Agent</span>
                    {sortField === 'agentName' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('riskLevel')}
                    className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-blue-400"
                  >
                    <span>Risk</span>
                    {sortField === 'riskLevel' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('action')}
                    className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-blue-400"
                  >
                    <span>Action</span>
                    {sortField === 'action' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('responseTime')}
                    className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-blue-400"
                  >
                    <span>Response Time</span>
                    {sortField === 'responseTime' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedEntries.map(entry => (
                <React.Fragment key={entry.id}>
                  <tr className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground">
                      {entry.toolName}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {entry.agentName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-medium ${getRiskColor(entry.riskLevel)}`}>
                        {entry.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center px-2 py-1 text-xs rounded ${getActionColor(entry.action)}`}>
                        <span className="mr-1">{getActionIcon(entry.action)}</span>
                        <span className="capitalize">{entry.action.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDuration(entry.responseTime)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {expandedEntry === entry.id ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedEntry === entry.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-background/50">
                        <div className="space-y-4">
                          {entry.reasoning && (
                            <div>
                              <div className="text-sm font-medium text-foreground mb-2">Reasoning:</div>
                              <div className="text-sm text-muted-foreground bg-background border border-border rounded p-3">
                                {entry.reasoning}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <div className="text-sm font-medium text-foreground mb-2">Tool Input:</div>
                            <div className="text-sm font-mono bg-background border border-border rounded p-3 overflow-x-auto">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(entry.input, null, 2)}</pre>
                            </div>
                          </div>
                          
                          {entry.riskFactors.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-foreground mb-2">Risk Factors:</div>
                              <ul className="space-y-1">
                                {entry.riskFactors.map((factor, index) => (
                                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                                    <span className="text-red-400 mr-2">•</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {entry.autoRule && (
                            <div>
                              <div className="text-sm font-medium text-foreground mb-2">Auto Rule Applied:</div>
                              <div className="text-sm text-blue-400">
                                {entry.autoRule.name} (ID: {entry.autoRule.id})
                              </div>
                            </div>
                          )}
                          
                          {entry.batchId && (
                            <div>
                              <div className="text-sm font-medium text-foreground mb-2">Batch Operation:</div>
                              <div className="text-sm text-muted-foreground">
                                Batch ID: {entry.batchId}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedEntries.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No audit entries found matching the current filters.
          </div>
        )}
      </div>
    </div>
  )
}