/**
 * CSV Import/Export API types for Agent Configuration
 * @module api/csv
 */

import type { AgentModel, AgentStatus } from './common';

// ============================================================================
// CSV Import Types
// ============================================================================

export interface CSVImportOptions {
  /**
   * Whether to validate data before import
   * @default true
   */
  validate?: boolean;

  /**
   * Whether to skip duplicate entries
   * @default true
   */
  skipDuplicates?: boolean;

  /**
   * Whether to update existing entries
   * @default false
   */
  updateExisting?: boolean;

  /**
   * Column mapping configuration
   */
  columnMapping?: CSVColumnMapping;

  /**
   * Batch size for processing large files
   * @default 100
   */
  batchSize?: number;

  /**
   * Whether to use streaming for large files
   * @default true
   */
  streaming?: boolean;
}

export interface CSVColumnMapping {
  /**
   * Map CSV column names to agent field names
   */
  fields: Record<string, string>;

  /**
   * Auto-detect column mappings
   * @default true
   */
  autoDetect?: boolean;

  /**
   * Custom transformers for specific fields
   */
  transformers?: Record<string, (value: string) => any>;
}

export interface CSVImportRequest {
  /**
   * CSV file content or path
   */
  data: string | File | Buffer;

  /**
   * Import configuration type
   */
  type: 'agents' | 'mcp-servers' | 'configurations';

  /**
   * Import options
   */
  options?: CSVImportOptions;
}

export interface CSVImportResponse {
  /**
   * Number of successfully imported records
   */
  imported: number;

  /**
   * Number of skipped records
   */
  skipped: number;

  /**
   * Number of failed records
   */
  failed: number;

  /**
   * Import errors if any
   */
  errors?: CSVImportError[];

  /**
   * Processing time in milliseconds
   */
  processingTime: number;

  /**
   * Import job ID for tracking
   */
  jobId: string;
}

export interface CSVImportError {
  /**
   * Row number where error occurred
   */
  row: number;

  /**
   * Column name or index
   */
  column?: string | number;

  /**
   * Error message
   */
  message: string;

  /**
   * Original data that failed
   */
  data?: Record<string, any>;
}

// ============================================================================
// CSV Export Types
// ============================================================================

export interface CSVExportOptions {
  /**
   * Fields to include in export
   */
  fields?: string[];

  /**
   * Whether to include headers
   * @default true
   */
  includeHeaders?: boolean;

  /**
   * Custom field formatters
   */
  formatters?: Record<string, (value: any) => string>;

  /**
   * Filter criteria for export
   */
  filter?: CSVExportFilter;

  /**
   * Maximum number of records to export
   */
  limit?: number;

  /**
   * Delimiter character
   * @default ","
   */
  delimiter?: string;

  /**
   * Quote character
   * @default '"'
   */
  quote?: string;
}

export interface CSVExportFilter {
  /**
   * Agent status filter
   */
  status?: AgentStatus[];

  /**
   * Agent model filter
   */
  models?: AgentModel[];

  /**
   * Date range filter
   */
  dateRange?: {
    start?: Date;
    end?: Date;
  };

  /**
   * Custom filter function
   */
  customFilter?: (record: any) => boolean;
}

export interface CSVExportRequest {
  /**
   * Export type
   */
  type: 'agents' | 'mcp-servers' | 'configurations' | 'logs';

  /**
   * Export options
   */
  options?: CSVExportOptions;
}

export interface CSVExportResponse {
  /**
   * CSV data as string or buffer
   */
  data: string | Buffer;

  /**
   * Suggested filename
   */
  filename: string;

  /**
   * Number of exported records
   */
  recordCount: number;

  /**
   * MIME type
   */
  contentType: 'text/csv';

  /**
   * File size in bytes
   */
  size: number;
}

// ============================================================================
// CSV Processing Types
// ============================================================================

export interface CSVParseResult<T = any> {
  /**
   * Parsed data records
   */
  data: T[];

  /**
   * Column headers
   */
  headers: string[];

  /**
   * Parse errors if any
   */
  errors?: CSVParseError[];

  /**
   * Metadata about the parse operation
   */
  metadata: CSVParseMetadata;
}

export interface CSVParseError {
  /**
   * Error type
   */
  type: 'INVALID_FORMAT' | 'MISSING_REQUIRED' | 'TYPE_MISMATCH' | 'VALIDATION_ERROR';

  /**
   * Error message
   */
  message: string;

  /**
   * Row number
   */
  row?: number;

  /**
   * Column identifier
   */
  column?: string | number;
}

export interface CSVParseMetadata {
  /**
   * Total rows processed
   */
  totalRows: number;

  /**
   * Valid rows
   */
  validRows: number;

  /**
   * Invalid rows
   */
  invalidRows: number;

  /**
   * Processing time
   */
  processingTime: number;

  /**
   * File size
   */
  fileSize?: number;
}

// ============================================================================
// Agent CSV Types
// ============================================================================

export interface AgentCSVRecord {
  name: string;
  model: AgentModel;
  status?: AgentStatus;
  description?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  mcpServers?: string; // Comma-separated list
  tags?: string; // Comma-separated list
  metadata?: string; // JSON string
}

export interface MCPServerCSVRecord {
  name: string;
  command: string;
  args?: string; // JSON array string
  env?: string; // JSON object string
  capabilities?: string; // Comma-separated list
  description?: string;
  version?: string;
  author?: string;
}

// ============================================================================
// CSV Validation Types
// ============================================================================

export interface CSVValidationRules {
  /**
   * Required fields
   */
  required: string[];

  /**
   * Field data types
   */
  types: Record<string, CSVFieldType>;

  /**
   * Field validators
   */
  validators?: Record<string, CSVFieldValidator>;

  /**
   * Maximum file size in bytes
   */
  maxFileSize?: number;

  /**
   * Maximum number of rows
   */
  maxRows?: number;
}

export type CSVFieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'enum' 
  | 'json' 
  | 'array';

export interface CSVFieldValidator {
  /**
   * Validation function
   */
  validate: (value: any) => boolean;

  /**
   * Error message if validation fails
   */
  errorMessage: string;
}

// ============================================================================
// CSV Stream Types
// ============================================================================

export interface CSVStreamOptions {
  /**
   * Chunk size for streaming
   */
  chunkSize?: number;

  /**
   * Progress callback
   */
  onProgress?: (progress: CSVStreamProgress) => void;

  /**
   * Error callback
   */
  onError?: (error: CSVImportError) => void;

  /**
   * Completion callback
   */
  onComplete?: (result: CSVImportResponse) => void;
}

export interface CSVStreamProgress {
  /**
   * Processed rows
   */
  processed: number;

  /**
   * Total rows (if known)
   */
  total?: number;

  /**
   * Progress percentage
   */
  percentage?: number;

  /**
   * Current chunk
   */
  chunk: number;

  /**
   * Estimated time remaining in seconds
   */
  estimatedTimeRemaining?: number;
}

// ============================================================================
// API Endpoints
// ============================================================================

export const CSV_API_ENDPOINTS = {
  // Import endpoints
  IMPORT_AGENTS: '/api/csv/import/agents',
  IMPORT_MCP_SERVERS: '/api/csv/import/mcp-servers',
  IMPORT_CONFIGURATIONS: '/api/csv/import/configurations',
  
  // Export endpoints
  EXPORT_AGENTS: '/api/csv/export/agents',
  EXPORT_MCP_SERVERS: '/api/csv/export/mcp-servers',
  EXPORT_CONFIGURATIONS: '/api/csv/export/configurations',
  EXPORT_LOGS: '/api/csv/export/logs',
  
  // Validation endpoints
  VALIDATE_CSV: '/api/csv/validate',
  GET_COLUMN_MAPPING: '/api/csv/mapping',
  
  // Job management
  GET_IMPORT_STATUS: '/api/csv/import/:jobId/status',
  CANCEL_IMPORT: '/api/csv/import/:jobId/cancel',
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isCSVImportError(error: any): error is CSVImportError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'row' in error &&
    'message' in error
  );
}

export function isAgentCSVRecord(record: any): record is AgentCSVRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'name' in record &&
    'model' in record
  );
}

export function isMCPServerCSVRecord(record: any): record is MCPServerCSVRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'name' in record &&
    'command' in record
  );
}