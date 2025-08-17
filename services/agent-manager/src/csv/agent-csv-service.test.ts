/**
 * Comprehensive Tests for Agent CSV Import/Export Service
 * Testing parsing, validation, column mapping, and large file processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentCSVService, ColumnMapping, CSVProcessingOptions } from './agent-csv-service'
import { Agent } from '@team-dashboard/types'

describe('AgentCSVService', () => {
  let csvService: AgentCSVService
  let mockAgents: Agent[]

  beforeEach(() => {
    csvService = new AgentCSVService()
    
    mockAgents = [
      {
        id: 'agent-1',
        name: 'TestAgent1',
        model: 'claude-3-sonnet',
        status: 'running',
        workspace: '/workspace/agent1',
        createdAt: '2025-08-17T12:00:00Z',
        tags: ['development', 'testing'],
        resourceLimits: { memory: 2048, cpu: 2 }
      },
      {
        id: 'agent-2',
        name: 'TestAgent2',
        model: 'gpt-4o',
        status: 'idle',
        workspace: '/workspace/agent2',
        createdAt: '2025-08-17T12:30:00Z',
        tags: ['production'],
        resourceLimits: { memory: 4096, cpu: 4 }
      }
    ]
  })

  describe('CSV Analysis and Column Detection', () => {
    it('should analyze CSV structure and detect column mappings', async () => {
      const csvContent = `Agent Name,Model Type,Workspace Path,Tags,Memory MB,CPU Cores,Auto Start
TestAgent1,claude-3-sonnet,/workspace/test1,"dev,test",2048,2,true
TestAgent2,gpt-4o,/workspace/test2,production,4096,4,false`

      const analysis = await csvService.analyzeCSV(csvContent)

      expect(analysis.confidence).toBeGreaterThan(0.7)
      expect(analysis.recommendedMapping['Agent Name']).toBe('name')
      expect(analysis.recommendedMapping['Model Type']).toBe('model')
      expect(analysis.recommendedMapping['Workspace Path']).toBe('workspace')
      expect(analysis.detectedColumns).toHaveLength(7)
    })

    it('should handle fuzzy column name matching', async () => {
      const csvContent = `agent_name,ai_model,directory_path,labels
TestAgent,claude-3-haiku,/test/workspace,testing`

      const analysis = await csvService.analyzeCSV(csvContent)

      expect(analysis.recommendedMapping['agent_name']).toBe('name')
      expect(analysis.recommendedMapping['ai_model']).toBe('model')
      expect(analysis.recommendedMapping['directory_path']).toBe('workspace')
      expect(analysis.recommendedMapping['labels']).toBe('tags')
    })

    it('should detect content-based column types', async () => {
      const csvContent = `Custom Name,AI Engine,Folder,Numbers,Boolean
TestAgent,gpt-4-turbo,/workspace/test,2048,true
Agent2,claude-3-opus,/home/agent,1024,false`

      const analysis = await csvService.analyzeCSV(csvContent)

      expect(analysis.confidence).toBeGreaterThan(0.5)
      expect(analysis.detectedColumns.some(c => c.possibleMapping === 'model')).toBe(true)
      expect(analysis.detectedColumns.some(c => c.possibleMapping === 'workspace')).toBe(true)
    })
  })

  describe('CSV Validation', () => {
    it('should validate valid CSV data', async () => {
      const csvContent = `name,model,workspace,tags,memoryLimit,cpuCores
TestAgent1,claude-3-sonnet,/workspace/test1,development,2048,2
TestAgent2,gpt-4o,/workspace/test2,production,4096,4`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'tags': 'tags',
        'memoryLimit': 'memoryLimit',
        'cpuCores': 'cpuCores'
      }

      const validation = await csvService.validateCSV(csvContent, columnMapping)

      expect(validation.valid).toBe(true)
      expect(validation.rowCount).toBe(2)
      expect(validation.validRowCount).toBe(2)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect validation errors', async () => {
      const csvContent = `name,model,workspace,memoryLimit
,invalid-model,/workspace/test1,not-a-number
TestAgent2,gpt-4o,,2048`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'memoryLimit': 'memoryLimit'
      }

      const validation = await csvService.validateCSV(csvContent, columnMapping)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some(e => e.column === 'name')).toBe(true)
      expect(validation.errors.some(e => e.column === 'model')).toBe(true)
    })

    it('should detect duplicate agent names', async () => {
      const csvContent = `name,model,workspace
TestAgent1,claude-3-sonnet,/workspace/test1
TestAgent1,gpt-4o,/workspace/test2`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace'
      }

      const validation = await csvService.validateCSV(csvContent, columnMapping, {
        allowDuplicateNames: false
      })

      expect(validation.duplicateCount).toBe(1)
      expect(validation.errors.some(e => e.message.includes('Duplicate'))).toBe(true)
    })

    it('should validate workspace paths', async () => {
      const csvContent = `name,model,workspace
TestAgent1,claude-3-sonnet,../invalid/path
TestAgent2,gpt-4o,/valid/workspace`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace'
      }

      const validation = await csvService.validateCSV(csvContent, columnMapping, {
        validateWorkspaces: true
      })

      expect(validation.warnings.length).toBeGreaterThan(0)
      expect(validation.warnings.some(w => w.message.includes('Workspace path'))).toBe(true)
    })
  })

  describe('CSV Import Processing', () => {
    it('should import valid agents from CSV', async () => {
      const csvContent = `name,model,workspace,tags
ImportedAgent1,claude-3-sonnet,/workspace/imported1,testing
ImportedAgent2,gpt-4o-mini,/workspace/imported2,production`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'tags': 'tags'
      }

      const result = await csvService.importAgentsFromCSV(csvContent, columnMapping)

      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.createdAgents).toHaveLength(2)
      expect(result.createdAgents[0].name).toBe('ImportedAgent1')
      expect(result.createdAgents[1].name).toBe('ImportedAgent2')
    })

    it('should handle import errors gracefully', async () => {
      const csvContent = `name,model,workspace
ValidAgent,claude-3-sonnet,/workspace/valid
,invalid-model,`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace'
      }

      const result = await csvService.importAgentsFromCSV(csvContent, columnMapping, {
        skipInvalidRows: true
      })

      expect(result.successful).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(1)
    })

    it('should track progress during import', async () => {
      const csvContent = `name,model,workspace
Agent1,claude-3-sonnet,/workspace/1
Agent2,gpt-4o,/workspace/2
Agent3,claude-3-haiku,/workspace/3`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace'
      }

      const progressCalls: Array<{ processed: number; total: number }> = []
      
      await csvService.importAgentsFromCSV(csvContent, columnMapping, {}, (processed, total) => {
        progressCalls.push({ processed, total })
      })

      expect(progressCalls.length).toBeGreaterThan(0)
      expect(progressCalls[progressCalls.length - 1].processed).toBe(3)
    })

    it('should handle environment variables in CSV', async () => {
      const csvContent = `name,model,workspace,environment
EnvAgent,claude-3-sonnet,/workspace/env,"{""NODE_ENV"":""test"",""API_KEY"":""secret""}"`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'environment': 'environment'
      }

      const result = await csvService.importAgentsFromCSV(csvContent, columnMapping)

      expect(result.successful).toBe(1)
      expect(result.createdAgents[0].name).toBe('EnvAgent')
    })
  })

  describe('CSV Export', () => {
    it('should export agents to standard CSV format', async () => {
      const csvOutput = await csvService.exportAgentsToCSV(mockAgents, {
        format: 'standard'
      })

      expect(csvOutput).toContain('name,model,workspace')
      expect(csvOutput).toContain('TestAgent1,claude-3-sonnet,/workspace/agent1')
      expect(csvOutput).toContain('TestAgent2,gpt-4o,/workspace/agent2')
      expect(csvOutput).toContain('development, testing')
      expect(csvOutput).toContain('production')
    })

    it('should export in detailed format with metrics', async () => {
      const agentWithMetrics: Agent = {
        ...mockAgents[0],
        metrics: {
          cpu: 45.5,
          memory: 1024,
          threads: 8,
          uptime: 3600,
          apiCalls: 150,
          tokensUsed: 25000
        }
      }

      const csvOutput = await csvService.exportAgentsToCSV([agentWithMetrics], {
        format: 'detailed',
        includeMetrics: true
      })

      expect(csvOutput).toContain('cpuUsage,memoryUsage,threads,uptime,apiCalls,tokensUsed')
      expect(csvOutput).toContain('45.5,1024,8,3600,150,25000')
    })

    it('should export in minimal format', async () => {
      const csvOutput = await csvService.exportAgentsToCSV(mockAgents, {
        format: 'minimal'
      })

      const lines = csvOutput.split('\n')
      const headers = lines[0].split(',')
      
      expect(headers).toEqual(['name', 'model', 'workspace', 'status'])
      expect(lines[1]).toContain('TestAgent1,claude-3-sonnet,/workspace/agent1,running')
    })

    it('should handle date formatting options', async () => {
      const csvOutput = await csvService.exportAgentsToCSV(mockAgents, {
        dateFormat: 'human'
      })

      // Should contain human-readable date instead of ISO format
      expect(csvOutput).not.toContain('2025-08-17T12:00:00Z')
      expect(csvOutput).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/)
    })
  })

  describe('Performance and Large File Handling', () => {
    it('should handle large CSV files efficiently', async () => {
      // Generate large CSV content
      const rows = Array.from({ length: 5000 }, (_, i) => 
        `Agent${i},claude-3-sonnet,/workspace/agent${i},tag${i}`
      )
      const csvContent = 'name,model,workspace,tags\n' + rows.join('\n')

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'tags': 'tags'
      }

      const startTime = Date.now()
      const result = await csvService.importAgentsFromCSV(csvContent, columnMapping, {
        chunkSize: 1000
      })
      const endTime = Date.now()

      expect(result.successful).toBe(5000)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should respect file size limits', async () => {
      const largeContent = 'name,model,workspace\n' + 'x'.repeat(100 * 1024 * 1024) // 100MB

      const options: Partial<CSVProcessingOptions> = {
        maxFileSize: 50 * 1024 * 1024 // 50MB limit
      }

      await expect(
        csvService.analyzeCSV(largeContent, options)
      ).rejects.toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty CSV files', async () => {
      const csvContent = ''

      await expect(
        csvService.analyzeCSV(csvContent)
      ).rejects.toThrow()
    })

    it('should handle CSV with only headers', async () => {
      const csvContent = 'name,model,workspace'

      const analysis = await csvService.analyzeCSV(csvContent)
      expect(analysis.detectedColumns).toHaveLength(3)
    })

    it('should handle malformed CSV', async () => {
      const csvContent = `name,model,workspace
Agent1,claude-3-sonnet,/workspace
"Unclosed quote,gpt-4o,/workspace2`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace'
      }

      // Should not throw, but handle gracefully
      const validation = await csvService.validateCSV(csvContent, columnMapping)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should handle different encodings', async () => {
      const csvContent = `name,model,workspace
Agént1,claude-3-sonnet,/workspace/tést`

      const analysis = await csvService.analyzeCSV(csvContent, {
        encoding: 'utf8'
      })

      expect(analysis.detectedColumns).toHaveLength(3)
    })

    it('should handle missing required columns', async () => {
      const csvContent = `name,model
TestAgent,claude-3-sonnet`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model'
      }

      const validation = await csvService.validateCSV(csvContent, columnMapping)
      expect(validation.errors.some(e => e.message.includes('required'))).toBe(true)
    })
  })

  describe('Column Mapping Edge Cases', () => {
    it('should handle unmapped columns gracefully', async () => {
      const csvContent = `name,model,workspace,unknown_column
TestAgent,claude-3-sonnet,/workspace,some_value`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'unknown_column': 'skip'
      }

      const validation = await csvService.validateCSV(csvContent, columnMapping)
      expect(validation.valid).toBe(true)
    })

    it('should validate complex tag structures', async () => {
      const csvContent = `name,model,workspace,tags
TestAgent,claude-3-sonnet,/workspace,"tag1, tag2, tag3"`

      const columnMapping: ColumnMapping = {
        'name': 'name',
        'model': 'model',
        'workspace': 'workspace',
        'tags': 'tags'
      }

      const result = await csvService.importAgentsFromCSV(csvContent, columnMapping)
      expect(result.successful).toBe(1)
    })
  })
})