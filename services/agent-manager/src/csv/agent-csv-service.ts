/**
 * Agent CSV Import/Export Service
 * Comprehensive CSV processing for bulk agent configuration management
 */

import Papa from 'papaparse';
import { z } from 'zod';
import { Agent, CreateAgentRequest, AgentModel } from '@team-dashboard/types';
import { validateWSMessage } from '@team-dashboard/utils';

// CSV Schema Validation
const AgentCSVRowSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(100, 'Agent name too long'),
  model: z.enum(['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']),
  workspace: z.string().min(1, 'Workspace path is required'),
  tags: z.string().optional(), // Comma-separated tags
  memoryLimit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  cpuCores: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  autoStart: z.string().optional().transform(val => val === 'true' || val === '1'),
  environment: z.string().optional(), // JSON string of env vars
});

export interface CSVProcessingOptions {
  maxFileSize: number; // bytes
  chunkSize: number; // rows per chunk
  skipInvalidRows: boolean;
  allowDuplicateNames: boolean;
  validateWorkspaces: boolean;
  encoding: 'utf8' | 'latin1' | 'ascii';
}

export interface ColumnMapping {
  [csvColumn: string]: keyof CreateAgentRequest | 'skip';
}

export interface CSVValidationResult {
  valid: boolean;
  errors: CSVValidationError[];
  warnings: CSVValidationWarning[];
  rowCount: number;
  validRowCount: number;
  duplicateCount: number;
  sampleData: any[];
}

export interface CSVValidationError {
  row: number;
  column: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface CSVValidationWarning {
  row: number;
  column: string;
  value: any;
  message: string;
  suggestion?: string;
}

export interface CSVImportResult {
  successful: number;
  failed: number;
  skipped: number;
  errors: CSVValidationError[];
  createdAgents: Agent[];
  processingTime: number;
}

export interface CSVExportOptions {
  includeMetrics: boolean;
  includeEnvironment: boolean;
  format: 'standard' | 'detailed' | 'minimal';
  dateFormat: 'iso' | 'human';
}

export interface CSVAnalysisResult {
  recommendedMapping: ColumnMapping;
  confidence: number;
  detectedColumns: {
    column: string;
    possibleMapping: string;
    confidence: number;
    samples: string[];
  }[];
  encoding: string;
  delimiter: string;
  headerRow: boolean;
}

/**
 * Enhanced CSV service for agent configuration management
 */
export class AgentCSVService {
  private defaultOptions: CSVProcessingOptions = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    chunkSize: 1000,
    skipInvalidRows: true,
    allowDuplicateNames: false,
    validateWorkspaces: true,
    encoding: 'utf8'
  };

  private commonColumnMappings = {
    // Name variations
    'name': 'name',
    'agent_name': 'name',
    'agentname': 'name',
    'title': 'name',
    
    // Model variations
    'model': 'model',
    'agent_model': 'model',
    'ai_model': 'model',
    'type': 'model',
    
    // Workspace variations
    'workspace': 'workspace',
    'path': 'workspace',
    'directory': 'workspace',
    'folder': 'workspace',
    
    // Tags variations
    'tags': 'tags',
    'labels': 'tags',
    'categories': 'tags',
    
    // Resource limits
    'memory': 'memoryLimit',
    'memory_limit': 'memoryLimit',
    'ram': 'memoryLimit',
    'cpu': 'cpuCores',
    'cpu_cores': 'cpuCores',
    'cores': 'cpuCores',
    
    // Auto start
    'auto_start': 'autoStart',
    'autostart': 'autoStart',
    'start_automatically': 'autoStart',
    
    // Environment
    'environment': 'environment',
    'env': 'environment',
    'env_vars': 'environment'
  };

  /**
   * Analyze CSV file structure and recommend column mappings
   */
  async analyzeCSV(fileContent: string, options?: Partial<CSVProcessingOptions>): Promise<CSVAnalysisResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Parse initial sample to detect structure
      const parseResult = Papa.parse(fileContent, {
        header: true,
        preview: 100,
        skipEmptyLines: true,
        encoding: opts.encoding,
        dynamicTyping: false
      });

      if (parseResult.errors.length > 0) {
        console.warn('[CSV] Parse warnings during analysis:', parseResult.errors);
      }

      const headers = parseResult.meta.fields || [];
      const sampleData = parseResult.data as any[];

      // Detect column mappings
      const detectedColumns = headers.map(header => {
        const normalized = header.toLowerCase().replace(/[\s_-]/g, '');
        const bestMatch = this.findBestColumnMatch(normalized, header, sampleData);
        
        return {
          column: header,
          possibleMapping: bestMatch.mapping,
          confidence: bestMatch.confidence,
          samples: sampleData.slice(0, 3).map(row => row[header]).filter(Boolean)
        };
      });

      // Build recommended mapping
      const recommendedMapping: ColumnMapping = {};
      let totalConfidence = 0;
      
      detectedColumns.forEach(col => {
        if (col.confidence > 0.7) {
          recommendedMapping[col.column] = col.possibleMapping as keyof CreateAgentRequest;
          totalConfidence += col.confidence;
        } else {
          recommendedMapping[col.column] = 'skip';
        }
      });

      const overallConfidence = detectedColumns.length > 0 ? totalConfidence / detectedColumns.length : 0;

      return {
        recommendedMapping,
        confidence: overallConfidence,
        detectedColumns,
        encoding: opts.encoding,
        delimiter: parseResult.meta.delimiter || ',',
        headerRow: true
      };
    } catch (error) {
      throw new Error(`CSV analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate CSV data against agent schema
   */
  async validateCSV(
    fileContent: string, 
    columnMapping: ColumnMapping,
    options?: Partial<CSVProcessingOptions>
  ): Promise<CSVValidationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: CSVValidationError[] = [];
    const warnings: CSVValidationWarning[] = [];
    const seenNames = new Set<string>();
    let validRowCount = 0;
    let duplicateCount = 0;

    try {
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        encoding: opts.encoding,
        transformHeader: (header) => header.trim()
      });

      const rows = parseResult.data as any[];
      const sampleData = rows.slice(0, 5);

      // Validate each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mappedRow = this.mapCSVRow(row, columnMapping);
        
        try {
          // Schema validation
          const validationResult = AgentCSVRowSchema.safeParse(mappedRow);
          
          if (validationResult.success) {
            validRowCount++;
            
            // Check for duplicates
            if (validationResult.data.name) {
              if (seenNames.has(validationResult.data.name)) {
                duplicateCount++;
                if (!opts.allowDuplicateNames) {
                  errors.push({
                    row: i + 2, // +2 for header and 0-based index
                    column: 'name',
                    value: validationResult.data.name,
                    message: 'Duplicate agent name',
                    severity: 'error'
                  });
                }
              } else {
                seenNames.add(validationResult.data.name);
              }
            }
            
            // Workspace validation
            if (opts.validateWorkspaces && validationResult.data.workspace) {
              if (!this.isValidWorkspacePath(validationResult.data.workspace)) {
                warnings.push({
                  row: i + 2,
                  column: 'workspace',
                  value: validationResult.data.workspace,
                  message: 'Workspace path may not be valid',
                  suggestion: 'Ensure path exists and is accessible'
                });
              }
            }
          } else {
            // Add validation errors
            validationResult.error.errors.forEach(err => {
              errors.push({
                row: i + 2,
                column: err.path.join('.'),
                value: err.input,
                message: err.message,
                severity: 'error'
              });
            });
          }
        } catch (error) {
          errors.push({
            row: i + 2,
            column: 'general',
            value: row,
            message: `Row validation failed: ${(error as Error).message}`,
            severity: 'error'
          });
        }
      }

      return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings,
        rowCount: rows.length,
        validRowCount,
        duplicateCount,
        sampleData
      };
    } catch (error) {
      throw new Error(`CSV validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Import agents from CSV with streaming processing
   */
  async importAgentsFromCSV(
    fileContent: string,
    columnMapping: ColumnMapping,
    options?: Partial<CSVProcessingOptions>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<CSVImportResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: CSVValidationError[] = [];
    const createdAgents: Agent[] = [];

    try {
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        encoding: opts.encoding,
        chunk: (results, parser) => {
          this.processCSVChunk(results.data, columnMapping, opts, {
            onSuccess: (agent) => {
              successful++;
              createdAgents.push(agent);
            },
            onError: (error) => {
              failed++;
              errors.push(error);
            },
            onSkip: () => {
              skipped++;
            }
          });
          
          if (onProgress) {
            const totalProcessed = successful + failed + skipped;
            onProgress(totalProcessed, parseResult.data.length);
          }
        }
      });

      return {
        successful,
        failed,
        skipped,
        errors,
        createdAgents,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`CSV import failed: ${(error as Error).message}`);
    }
  }

  /**
   * Export agents to CSV format
   */
  async exportAgentsToCSV(
    agents: Agent[], 
    options?: CSVExportOptions
  ): Promise<string> {
    const opts: CSVExportOptions = {
      includeMetrics: false,
      includeEnvironment: false,
      format: 'standard',
      dateFormat: 'iso',
      ...options
    };

    try {
      const csvData = agents.map(agent => {
        const baseData = {
          name: agent.name,
          model: agent.model,
          workspace: agent.workspace,
          tags: agent.tags?.join(', ') || '',
          status: agent.status,
          created: opts.dateFormat === 'iso' ? agent.createdAt : new Date(agent.createdAt).toLocaleString(),
          memoryLimit: agent.resourceLimits?.memory || '',
          cpuCores: agent.resourceLimits?.cpu || ''
        };

        if (opts.format === 'detailed') {
          return {
            ...baseData,
            id: agent.id,
            pid: agent.pid || '',
            startedAt: agent.startedAt || '',
            stoppedAt: agent.stoppedAt || '',
            lastActivity: agent.lastActivity || '',
            ...(opts.includeMetrics && agent.metrics ? {
              cpuUsage: agent.metrics.cpu,
              memoryUsage: agent.metrics.memory,
              threads: agent.metrics.threads,
              uptime: agent.metrics.uptime,
              apiCalls: agent.metrics.apiCalls,
              tokensUsed: agent.metrics.tokensUsed
            } : {})
          };
        }

        if (opts.format === 'minimal') {
          return {
            name: agent.name,
            model: agent.model,
            workspace: agent.workspace,
            status: agent.status
          };
        }

        return baseData;
      });

      return Papa.unparse(csvData, {
        header: true,
        delimiter: ',',
        newline: '\n'
      });
    } catch (error) {
      throw new Error(`CSV export failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process a chunk of CSV data
   */
  private async processCSVChunk(
    rows: any[], 
    columnMapping: ColumnMapping,
    options: CSVProcessingOptions,
    callbacks: {
      onSuccess: (agent: Agent) => void;
      onError: (error: CSVValidationError) => void;
      onSkip: () => void;
    }
  ): Promise<void> {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const mappedRow = this.mapCSVRow(row, columnMapping);
        const validationResult = AgentCSVRowSchema.safeParse(mappedRow);
        
        if (validationResult.success) {
          // Create agent configuration
          const agentConfig: CreateAgentRequest = {
            name: validationResult.data.name,
            model: validationResult.data.model,
            workspace: validationResult.data.workspace,
            tags: validationResult.data.tags?.split(',').map(t => t.trim()) || [],
            resourceLimits: {
              memory: validationResult.data.memoryLimit,
              cpu: validationResult.data.cpuCores
            },
            autoStart: validationResult.data.autoStart,
            environment: validationResult.data.environment ? JSON.parse(validationResult.data.environment) : undefined
          };

          // Here you would integrate with your agent manager to create the agent
          // For now, we'll create a mock agent response
          const agent: Agent = {
            id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: agentConfig.name,
            model: agentConfig.model,
            status: 'idle',
            workspace: agentConfig.workspace,
            createdAt: new Date().toISOString(),
            resourceLimits: agentConfig.resourceLimits,
            tags: agentConfig.tags
          };

          callbacks.onSuccess(agent);
        } else {
          if (options.skipInvalidRows) {
            callbacks.onSkip();
          } else {
            callbacks.onError({
              row: i + 1,
              column: 'validation',
              value: row,
              message: validationResult.error.errors[0].message,
              severity: 'error'
            });
          }
        }
      } catch (error) {
        callbacks.onError({
          row: i + 1,
          column: 'processing',
          value: row,
          message: `Processing error: ${(error as Error).message}`,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Map CSV row to agent configuration
   */
  private mapCSVRow(row: any, columnMapping: ColumnMapping): any {
    const mapped: any = {};
    
    Object.entries(columnMapping).forEach(([csvColumn, targetField]) => {
      if (targetField !== 'skip' && row[csvColumn] !== undefined) {
        mapped[targetField] = row[csvColumn];
      }
    });
    
    return mapped;
  }

  /**
   * Find best column match using fuzzy matching
   */
  private findBestColumnMatch(
    normalizedHeader: string, 
    originalHeader: string, 
    sampleData: any[]
  ): { mapping: string; confidence: number } {
    let bestMatch = 'skip';
    let bestScore = 0;

    // Exact match
    if (this.commonColumnMappings[normalizedHeader]) {
      return { mapping: this.commonColumnMappings[normalizedHeader], confidence: 1.0 };
    }

    // Fuzzy matching
    Object.entries(this.commonColumnMappings).forEach(([pattern, mapping]) => {
      const score = this.calculateSimilarity(normalizedHeader, pattern);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = mapping;
      }
    });

    // Content-based detection
    if (bestScore < 0.8 && sampleData.length > 0) {
      const contentScore = this.analyzeColumnContent(originalHeader, sampleData);
      if (contentScore.confidence > bestScore) {
        bestMatch = contentScore.mapping;
        bestScore = contentScore.confidence;
      }
    }

    return { mapping: bestMatch, confidence: bestScore };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    return 1 - distance / Math.max(str1.length, str2.length);
  }

  /**
   * Analyze column content to detect data type
   */
  private analyzeColumnContent(header: string, sampleData: any[]): { mapping: string; confidence: number } {
    const samples = sampleData.map(row => row[header]).filter(Boolean);
    
    if (samples.length === 0) {
      return { mapping: 'skip', confidence: 0 };
    }

    // Model detection
    const modelValues = ['gpt-4', 'claude', 'sonnet', 'haiku', 'opus', 'turbo'];
    if (samples.some(s => modelValues.some(m => s.toLowerCase().includes(m)))) {
      return { mapping: 'model', confidence: 0.9 };
    }

    // Workspace path detection
    if (samples.some(s => s.includes('/') || s.includes('\\') || s.includes('workspace'))) {
      return { mapping: 'workspace', confidence: 0.8 };
    }

    // Number detection (for resource limits)
    if (samples.every(s => !isNaN(parseInt(s)))) {
      if (header.toLowerCase().includes('memory') || header.toLowerCase().includes('ram')) {
        return { mapping: 'memoryLimit', confidence: 0.9 };
      }
      if (header.toLowerCase().includes('cpu') || header.toLowerCase().includes('core')) {
        return { mapping: 'cpuCores', confidence: 0.9 };
      }
    }

    // Boolean detection
    const boolValues = ['true', 'false', '1', '0', 'yes', 'no'];
    if (samples.every(s => boolValues.includes(s.toLowerCase()))) {
      return { mapping: 'autoStart', confidence: 0.8 };
    }

    return { mapping: 'skip', confidence: 0 };
  }

  /**
   * Validate workspace path
   */
  private isValidWorkspacePath(path: string): boolean {
    // Basic validation - in real implementation, you'd check if path exists
    return path.length > 0 && !path.includes('..') && (path.startsWith('/') || path.match(/^[a-zA-Z]:/));
  }
}