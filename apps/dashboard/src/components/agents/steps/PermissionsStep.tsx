import React from 'react'
import { AgentConfiguration } from '@team-dashboard/types'

interface PermissionsStepProps {
  config: Partial<AgentConfiguration>
  onUpdateConfig: (updates: Partial<AgentConfiguration>) => void
}

export function PermissionsStep({ config, onUpdateConfig }: PermissionsStepProps) {
  const permissions = [
    {
      key: 'fileAccess',
      name: 'File System Access',
      description: 'Allow the agent to read and write files',
      defaultValue: false
    },
    {
      key: 'networkAccess',
      name: 'Network Access',
      description: 'Allow the agent to make network requests',
      defaultValue: false
    },
    {
      key: 'toolExecution',
      name: 'Tool Execution',
      description: 'Allow the agent to execute tools and commands',
      defaultValue: true
    },
    {
      key: 'memoryAccess',
      name: 'Memory Access',
      description: 'Allow the agent to store and retrieve information',
      defaultValue: true
    }
  ]

  const handlePermissionToggle = (key: string, value: boolean) => {
    onUpdateConfig({
      permissions: {
        ...config.permissions,
        [key]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Permissions</h3>
        <p className="text-muted-foreground mb-6">
          Configure what your agent is allowed to do. These permissions control access to system resources and capabilities.
        </p>
      </div>

      <div className="space-y-4">
        {permissions.map((permission) => (
          <div key={permission.key} className="flex items-start space-x-3 p-4 border border-border rounded-md">
            <input
              type="checkbox"
              checked={config.permissions?.[permission.key] ?? permission.defaultValue}
              onChange={(e) => handlePermissionToggle(permission.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 mt-1"
            />
            <div className="flex-1">
              <h5 className="font-medium text-foreground">{permission.name}</h5>
              <p className="text-sm text-muted-foreground mt-1">{permission.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 rounded-md p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 dark:text-yellow-400">⚠️</div>
          <div>
            <h5 className="font-medium text-yellow-800 dark:text-yellow-400">Security Notice</h5>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Only grant permissions that your agent actually needs. Excessive permissions can pose security risks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}