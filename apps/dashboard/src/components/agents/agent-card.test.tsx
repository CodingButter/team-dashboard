import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../../../../test/utils'
import { AgentCard } from './agent-card'
import type { AgentModel, AgentStatus, AgentConfiguration } from '@team-dashboard/types'

// Mock the AgentTerminal component since it has complex dependencies
vi.mock('./agent-terminal', () => ({
  AgentTerminal: ({ agentId, agentName }: { agentId: string; agentName: string }) => (
    <div data-testid="agent-terminal">
      Terminal for {agentName} ({agentId})
    </div>
  ),
}))

const createMockAgent = (overrides = {}) => ({
  id: 'test-agent-123',
  name: 'Test Agent',
  model: 'gpt-4o' as AgentModel,
  status: 'running' as AgentStatus,
  workspace: '/test/workspace',
  uptime: 3661, // 1 hour 1 minute 1 second
  lastActivity: Date.now(),
  cpu: 25.5,
  memory: 157286400, // ~150MB
  configuration: {
    id: 'test-config-123',
    name: 'Test Configuration',
    model: 'gpt-4o',
    systemPromptId: 'test-prompt-123',
    mcpServers: ['server1', 'server2'],
    toolPermissions: {},
  } as AgentConfiguration,
  systemPrompt: 'You are a test agent',
  ...overrides,
})

describe('AgentCard', () => {
  it('renders agent basic information', () => {
    const agent = createMockAgent()
    render(<AgentCard agent={agent} />)

    expect(screen.getByText('Test Agent')).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('/test/workspace')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
  })

  it('displays correct status colors', () => {
    const runningAgent = createMockAgent({ status: 'running' })
    const { rerender } = render(<AgentCard agent={runningAgent} />)
    
    const statusBadge = screen.getByText('running')
    expect(statusBadge).toHaveClass('text-green-400', 'bg-green-400/10')

    const pausedAgent = createMockAgent({ status: 'paused' })
    rerender(<AgentCard agent={pausedAgent} />)
    
    const pausedBadge = screen.getByText('paused')
    expect(pausedBadge).toHaveClass('text-yellow-400', 'bg-yellow-400/10')
  })

  it('displays model badges with correct colors', () => {
    const gptAgent = createMockAgent({ model: 'gpt-4o' })
    const { rerender } = render(<AgentCard agent={gptAgent} />)
    
    const gptBadge = screen.getByText('GPT-4o')
    expect(gptBadge).toHaveClass('text-green-400', 'bg-green-400/10')

    const claudeOpusAgent = createMockAgent({ model: 'claude-3-opus' })
    rerender(<AgentCard agent={claudeOpusAgent} />)
    
    const claudeBadge = screen.getByText('Claude 3 Opus')
    expect(claudeBadge).toHaveClass('text-purple-400', 'bg-purple-400/10')
  })

  it('formats uptime correctly', () => {
    const agent = createMockAgent({ uptime: 3661 }) // 1h 1m 1s
    render(<AgentCard agent={agent} />)
    
    expect(screen.getByText('1h 1m')).toBeInTheDocument()
  })

  it('formats memory correctly', () => {
    const agent = createMockAgent({ memory: 157286400 }) // ~150MB
    render(<AgentCard agent={agent} />)
    
    expect(screen.getByText('150.0MB')).toBeInTheDocument()
  })

  it('displays N/A for missing data', () => {
    const agent = createMockAgent({ uptime: undefined, cpu: undefined, memory: undefined })
    render(<AgentCard agent={agent} />)
    
    expect(screen.getAllByText('N/A')).toHaveLength(3)
  })

  it('shows and hides terminal when clicked', () => {
    const agent = createMockAgent()
    render(<AgentCard agent={agent} />)

    // Terminal should be hidden initially
    expect(screen.queryByTestId('agent-terminal')).not.toBeInTheDocument()
    expect(screen.getByText('Show Terminal')).toBeInTheDocument()

    // Click to show terminal
    fireEvent.click(screen.getByText('Show Terminal'))
    expect(screen.getByTestId('agent-terminal')).toBeInTheDocument()
    expect(screen.getByText('Hide Terminal')).toBeInTheDocument()

    // Click to hide terminal
    fireEvent.click(screen.getByText('Hide Terminal'))
    expect(screen.queryByTestId('agent-terminal')).not.toBeInTheDocument()
    expect(screen.getByText('Show Terminal')).toBeInTheDocument()
  })

  it('displays correct action buttons based on status', () => {
    const onStart = vi.fn()
    const onStop = vi.fn()
    const onPause = vi.fn()
    const onResume = vi.fn()

    // Test stopped agent
    const stoppedAgent = createMockAgent({ status: 'stopped' })
    const { rerender } = render(
      <AgentCard agent={stoppedAgent} onStart={onStart} onStop={onStop} onPause={onPause} onResume={onResume} />
    )
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.queryByText('Stop')).not.toBeInTheDocument()
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()

    // Test running agent
    const runningAgent = createMockAgent({ status: 'running' })
    rerender(
      <AgentCard agent={runningAgent} onStart={onStart} onStop={onStop} onPause={onPause} onResume={onResume} />
    )
    expect(screen.getByText('Stop')).toBeInTheDocument()
    expect(screen.getByText('Pause')).toBeInTheDocument()
    expect(screen.queryByText('Start')).not.toBeInTheDocument()

    // Test paused agent
    const pausedAgent = createMockAgent({ status: 'paused' })
    rerender(
      <AgentCard agent={pausedAgent} onStart={onStart} onStop={onStop} onPause={onPause} onResume={onResume} />
    )
    expect(screen.getByText('Resume')).toBeInTheDocument()
    expect(screen.queryByText('Pause')).not.toBeInTheDocument()
  })

  it('calls action handlers when buttons are clicked', () => {
    const onStart = vi.fn()
    const onPause = vi.fn()
    const onEdit = vi.fn()
    const onViewLogs = vi.fn()
    const onTerminate = vi.fn()

    const agent = createMockAgent({ status: 'running' })
    render(
      <AgentCard 
        agent={agent} 
        onStart={onStart}
        onPause={onPause}
        onEdit={onEdit}
        onViewLogs={onViewLogs}
        onTerminate={onTerminate}
      />
    )

    fireEvent.click(screen.getByText('Pause'))
    expect(onPause).toHaveBeenCalledWith(agent.id)

    fireEvent.click(screen.getByText('Configure'))
    expect(onEdit).toHaveBeenCalledWith(agent.id)

    fireEvent.click(screen.getByText('Logs'))
    expect(onViewLogs).toHaveBeenCalledWith(agent.id)

    fireEvent.click(screen.getByText('Terminate'))
    expect(onTerminate).toHaveBeenCalledWith(agent.id)
  })

  it('displays MCP server count when available', () => {
    const agent = createMockAgent({
      configuration: {
        id: 'test-config-123',
        name: 'Test Agent Config',
        model: 'gpt-4o',
        systemPromptId: 'test-prompt-123',
        mcpServers: ['server1', 'server2', 'server3'],
        toolPermissions: {},
      },
    })
    render(<AgentCard agent={agent} />)
    
    expect(screen.getByText('3 MCP servers')).toBeInTheDocument()
  })

  it('displays model provider correctly', () => {
    const gptAgent = createMockAgent({ model: 'gpt-4o' })
    const { rerender } = render(<AgentCard agent={gptAgent} />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()

    const claudeAgent = createMockAgent({ model: 'claude-3-sonnet' })
    rerender(<AgentCard agent={claudeAgent} />)
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  it('handles onClick when provided', () => {
    const onClick = vi.fn()
    const agent = createMockAgent()
    render(<AgentCard agent={agent} onClick={onClick} />)

    fireEvent.click(screen.getByRole('generic'))
    expect(onClick).toHaveBeenCalled()
  })

  it('displays last activity time', () => {
    const lastActivity = Date.now()
    const agent = createMockAgent({ lastActivity })
    render(<AgentCard agent={agent} />)

    const expectedTime = new Date(lastActivity).toLocaleTimeString()
    expect(screen.getByText(`Last activity: ${expectedTime}`)).toBeInTheDocument()
  })

  it('displays "Never" for missing last activity', () => {
    const agent = createMockAgent({ lastActivity: undefined })
    render(<AgentCard agent={agent} />)

    expect(screen.getByText('Last activity: Never')).toBeInTheDocument()
  })
})