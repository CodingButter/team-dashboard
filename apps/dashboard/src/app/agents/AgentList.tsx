/**
 * Agent List Component
 * Displays the grid of agent cards with filtering and actions
 */

import React from 'react'
import { AgentCard } from '../../components/agents/agent-card'
import { Agent } from './mock-data'

interface AgentListProps {
  agents: Agent[]
  onStartAgent: (agentId: string) => void
  onStopAgent: (agentId: string) => void
  onPauseAgent: (agentId: string) => void
  onDeleteAgent: (agentId: string) => void
  onSelectAgent: (agent: Agent) => void
}

export function AgentList({
  agents,
  onStartAgent,
  onStopAgent,
  onPauseAgent,
  onDeleteAgent,
  onSelectAgent,
}: AgentListProps) {
  const runningAgents = agents.filter(agent => agent.status === 'running')
  const totalCpu = runningAgents.reduce((sum, agent) => sum + (agent.cpu || 0), 0)
  const totalMemory = runningAgents.reduce((sum, agent) => sum + (agent.memory || 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Agents
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {agents.length}
              </p>
            </div>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Running
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {runningAgents.length}
              </p>
            </div>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                CPU Usage
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {totalCpu.toFixed(1)}%
              </p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Memory
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(totalMemory / (1024 * 1024 * 1024)).toFixed(1)}GB
              </p>
            </div>
            <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onStart={() => onStartAgent(agent.id)}
            onStop={() => onStopAgent(agent.id)}
            onPause={() => onPauseAgent(agent.id)}
            onDelete={() => onDeleteAgent(agent.id)}
            onClick={() => onSelectAgent(agent)}
          />
        ))}
      </div>
    </div>
  )
}