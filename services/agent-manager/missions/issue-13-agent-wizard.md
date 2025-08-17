# URGENT MISSION: Agent Creation Wizard UI - Issue #13

## YOUR TASK: BUILD THIS NOW!

**GitHub Issue**: #13 - Create agent creation wizard UI
**Priority**: P0 - CRITICAL
**Agent**: frontend-expert

## START CODING IMMEDIATELY!

### CREATE THIS FILE NOW:
**File**: `/apps/dashboard/src/app/agents/create/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/components/ui/card';
import { ChevronRight, Sparkles, Code, Brain, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

const AGENT_TYPES = [
  { id: 'frontend-expert', name: 'Frontend Expert', icon: Code, color: 'blue' },
  { id: 'backend-specialist', name: 'Backend Specialist', icon: Brain, color: 'green' },
  { id: 'performance-engineer', name: 'Performance Engineer', icon: Zap, color: 'yellow' },
  { id: 'custom', name: 'Custom Agent', icon: Sparkles, color: 'purple' }
];

export default function CreateAgentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [agentConfig, setAgentConfig] = useState({
    type: '',
    name: '',
    systemPrompt: '',
    mcpServers: [] as string[],
    tools: [] as string[],
    memoryEnabled: true,
    autoStart: false
  });

  const handleCreate = async () => {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentConfig)
    });
    
    const agent = await response.json();
    router.push(`/agents/${agent.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Agent</h1>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 flex-1 rounded ${i <= step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Choose Agent Type</h2>
          <div className="grid grid-cols-2 gap-4">
            {AGENT_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all ${
                    agentConfig.type === type.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setAgentConfig({...agentConfig, type: type.id})}
                >
                  <CardHeader>
                    <Icon className={`w-8 h-8 text-${type.color}-500 mb-2`} />
                    <CardTitle>{type.name}</CardTitle>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
          <Button 
            onClick={() => setStep(2)} 
            disabled={!agentConfig.type}
            className="mt-6"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Agent Name</Label>
              <Input 
                value={agentConfig.name}
                onChange={(e) => setAgentConfig({...agentConfig, name: e.target.value})}
                placeholder="My Custom Agent"
              />
            </div>
            <div>
              <Label>System Prompt</Label>
              <Textarea 
                value={agentConfig.systemPrompt}
                onChange={(e) => setAgentConfig({...agentConfig, systemPrompt: e.target.value})}
                placeholder="You are a helpful assistant..."
                rows={6}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>MCP Servers & Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>MCP Servers</Label>
                <div className="space-y-2">
                  {['memento', 'playwright', 'code-health'].map(server => (
                    <label key={server} className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={agentConfig.mcpServers.includes(server)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAgentConfig({
                              ...agentConfig, 
                              mcpServers: [...agentConfig.mcpServers, server]
                            });
                          } else {
                            setAgentConfig({
                              ...agentConfig,
                              mcpServers: agentConfig.mcpServers.filter(s => s !== server)
                            });
                          }
                        }}
                      />
                      {server}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleCreate}>Create Agent</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## START NOW! Create the wizard and deploy the agent!