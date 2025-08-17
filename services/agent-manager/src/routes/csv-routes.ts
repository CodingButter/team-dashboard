/**
 * CSV Import/Export REST API Endpoints
 * Comprehensive API for agent configuration CSV processing
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AgentCSVService, ColumnMapping, CSVProcessingOptions } from '../csv/agent-csv-service';
import { defaultMessageValidator } from '../validation/message-validator';
import { ErrorCode, createErrorResponse } from '@team-dashboard/types';
import multer from 'fastify-multer';

// Request schemas
interface AnalyzeCSVRequest {
  Body: {
    content: string;
    options?: Partial<CSVProcessingOptions>;
  };
}

interface ValidateCSVRequest {
  Body: {
    content: string;
    columnMapping: ColumnMapping;
    options?: Partial<CSVProcessingOptions>;
  };
}

interface ImportCSVRequest {
  Body: {
    content: string;
    columnMapping: ColumnMapping;
    options?: Partial<CSVProcessingOptions>;
  };
}

interface ExportCSVRequest {
  Querystring: {
    format?: 'standard' | 'detailed' | 'minimal';
    includeMetrics?: boolean;
    includeEnvironment?: boolean;
    dateFormat?: 'iso' | 'human';
  };
}

// Multer configuration for file uploads
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * Register CSV processing routes
 */
export async function csvRoutes(fastify: FastifyInstance) {
  const csvService = new AgentCSVService();

  // Register multer for file uploads
  await fastify.register(multer.contentParser);

  /**
   * POST /api/csv/analyze
   * Analyze CSV structure and recommend column mappings
   */
  fastify.post<AnalyzeCSVRequest>('/api/csv/analyze', {
    schema: {
      description: 'Analyze CSV structure and recommend column mappings',
      tags: ['CSV'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', description: 'CSV file content' },
          options: {
            type: 'object',
            properties: {
              encoding: { type: 'string', enum: ['utf8', 'latin1', 'ascii'] },
              maxFileSize: { type: 'number' },
              validateWorkspaces: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                recommendedMapping: { type: 'object' },
                confidence: { type: 'number' },
                detectedColumns: { type: 'array' },
                encoding: { type: 'string' },
                delimiter: { type: 'string' },
                headerRow: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<AnalyzeCSVRequest>, reply: FastifyReply) => {
      try {
        const { content, options } = request.body;

        if (!content || content.trim().length === 0) {
          return reply.code(400).send(createErrorResponse(
            ErrorCode.INVALID_INPUT,
            'CSV content is required'
          ));
        }

        const analysis = await csvService.analyzeCSV(content, options);

        return reply.send({
          success: true,
          data: analysis
        });
      } catch (error) {
        fastify.log.error('CSV analysis failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `CSV analysis failed: ${(error as Error).message}`
        ));
      }
    }
  });

  /**
   * POST /api/csv/validate
   * Validate CSV data against agent schema
   */
  fastify.post<ValidateCSVRequest>('/api/csv/validate', {
    schema: {
      description: 'Validate CSV data against agent schema',
      tags: ['CSV'],
      body: {
        type: 'object',
        required: ['content', 'columnMapping'],
        properties: {
          content: { type: 'string', description: 'CSV file content' },
          columnMapping: { type: 'object', description: 'Column mapping configuration' },
          options: {
            type: 'object',
            properties: {
              skipInvalidRows: { type: 'boolean' },
              allowDuplicateNames: { type: 'boolean' },
              validateWorkspaces: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                errors: { type: 'array' },
                warnings: { type: 'array' },
                rowCount: { type: 'number' },
                validRowCount: { type: 'number' },
                duplicateCount: { type: 'number' },
                sampleData: { type: 'array' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<ValidateCSVRequest>, reply: FastifyReply) => {
      try {
        const { content, columnMapping, options } = request.body;

        if (!content || !columnMapping) {
          return reply.code(400).send(createErrorResponse(
            ErrorCode.INVALID_INPUT,
            'CSV content and column mapping are required'
          ));
        }

        const validation = await csvService.validateCSV(content, columnMapping, options);

        return reply.send({
          success: true,
          data: validation
        });
      } catch (error) {
        fastify.log.error('CSV validation failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          `CSV validation failed: ${(error as Error).message}`
        ));
      }
    }
  });

  /**
   * POST /api/csv/import
   * Import agents from CSV with real-time progress
   */
  fastify.post<ImportCSVRequest>('/api/csv/import', {
    schema: {
      description: 'Import agents from CSV file',
      tags: ['CSV'],
      body: {
        type: 'object',
        required: ['content', 'columnMapping'],
        properties: {
          content: { type: 'string', description: 'CSV file content' },
          columnMapping: { type: 'object', description: 'Column mapping configuration' },
          options: {
            type: 'object',
            properties: {
              chunkSize: { type: 'number' },
              skipInvalidRows: { type: 'boolean' },
              allowDuplicateNames: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                successful: { type: 'number' },
                failed: { type: 'number' },
                skipped: { type: 'number' },
                errors: { type: 'array' },
                createdAgents: { type: 'array' },
                processingTime: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest<ImportCSVRequest>, reply: FastifyReply) => {
      try {
        const { content, columnMapping, options } = request.body;

        if (!content || !columnMapping) {
          return reply.code(400).send(createErrorResponse(
            ErrorCode.INVALID_INPUT,
            'CSV content and column mapping are required'
          ));
        }

        // For real-time progress, you could use WebSocket or Server-Sent Events
        // For now, we'll process synchronously
        const result = await csvService.importAgentsFromCSV(
          content, 
          columnMapping, 
          options,
          (processed, total) => {
            // Progress callback - could emit to WebSocket clients
            fastify.log.info(`CSV import progress: ${processed}/${total}`);
          }
        );

        return reply.send({
          success: true,
          data: result
        });
      } catch (error) {
        fastify.log.error('CSV import failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `CSV import failed: ${(error as Error).message}`
        ));
      }
    }
  });

  /**
   * POST /api/csv/upload
   * Upload CSV file for processing (multipart/form-data)
   */
  fastify.post('/api/csv/upload', {
    preHandler: upload.single('csvFile'),
    schema: {
      description: 'Upload CSV file for analysis',
      tags: ['CSV'],
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                size: { type: 'number' },
                content: { type: 'string' },
                analysis: { type: 'object' }
              }
            }
          }
        }
      }
    },
    handler: async (request: any, reply: FastifyReply) => {
      try {
        if (!request.file) {
          return reply.code(400).send(createErrorResponse(
            ErrorCode.INVALID_INPUT,
            'CSV file is required'
          ));
        }

        const content = request.file.buffer.toString('utf8');
        
        // Analyze the uploaded CSV
        const analysis = await csvService.analyzeCSV(content);

        return reply.send({
          success: true,
          data: {
            filename: request.file.originalname,
            size: request.file.size,
            content: content,
            analysis: analysis
          }
        });
      } catch (error) {
        fastify.log.error('CSV upload failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `CSV upload failed: ${(error as Error).message}`
        ));
      }
    }
  });

  /**
   * GET /api/csv/export
   * Export agents to CSV format
   */
  fastify.get<ExportCSVRequest>('/api/csv/export', {
    schema: {
      description: 'Export agents to CSV format',
      tags: ['CSV'],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['standard', 'detailed', 'minimal'] },
          includeMetrics: { type: 'boolean' },
          includeEnvironment: { type: 'boolean' },
          dateFormat: { type: 'string', enum: ['iso', 'human'] }
        }
      },
      response: {
        200: {
          type: 'string',
          description: 'CSV file content'
        }
      }
    },
    handler: async (request: FastifyRequest<ExportCSVRequest>, reply: FastifyReply) => {
      try {
        // In a real implementation, you'd fetch agents from your agent manager
        // For now, we'll return empty CSV structure
        const mockAgents = []; // Replace with actual agent fetching logic

        const csvContent = await csvService.exportAgentsToCSV(mockAgents, {
          format: request.query.format || 'standard',
          includeMetrics: request.query.includeMetrics || false,
          includeEnvironment: request.query.includeEnvironment || false,
          dateFormat: request.query.dateFormat || 'iso'
        });

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="agents.csv"');
        
        return reply.send(csvContent);
      } catch (error) {
        fastify.log.error('CSV export failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `CSV export failed: ${(error as Error).message}`
        ));
      }
    }
  });

  /**
   * GET /api/csv/template
   * Download CSV template for agent import
   */
  fastify.get('/api/csv/template', {
    schema: {
      description: 'Download CSV template for agent import',
      tags: ['CSV'],
      response: {
        200: {
          type: 'string',
          description: 'CSV template content'
        }
      }
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const template = `name,model,workspace,tags,memoryLimit,cpuCores,autoStart,environment
ExampleAgent,claude-3-sonnet,/workspace/example,"development,testing",2048,2,true,"{""NODE_ENV"":""development""}"
ProductionAgent,gpt-4o,/workspace/production,production,4096,4,false,"{""NODE_ENV"":""production"",""LOG_LEVEL"":""info""}"`;

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="agent-import-template.csv"');
        
        return reply.send(template);
      } catch (error) {
        fastify.log.error('Template generation failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `Template generation failed: ${(error as Error).message}`
        ));
      }
    }
  });

  /**
   * GET /api/csv/formats
   * Get supported CSV formats and validation rules
   */
  fastify.get('/api/csv/formats', {
    schema: {
      description: 'Get supported CSV formats and validation rules',
      tags: ['CSV'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                supportedModels: { type: 'array' },
                requiredColumns: { type: 'array' },
                optionalColumns: { type: 'array' },
                validationRules: { type: 'object' },
                exampleMappings: { type: 'object' }
              }
            }
          }
        }
      }
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const formatInfo = {
          supportedModels: [
            'claude-3-opus',
            'claude-3-sonnet', 
            'claude-3-haiku',
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-3.5-turbo'
          ],
          requiredColumns: ['name', 'model', 'workspace'],
          optionalColumns: ['tags', 'memoryLimit', 'cpuCores', 'autoStart', 'environment'],
          validationRules: {
            name: 'String, 1-100 characters, unique',
            model: 'One of supported models',
            workspace: 'Valid file system path',
            tags: 'Comma-separated string',
            memoryLimit: 'Integer, MB',
            cpuCores: 'Integer, number of CPU cores',
            autoStart: 'Boolean (true/false, 1/0, yes/no)',
            environment: 'JSON string of environment variables'
          },
          exampleMappings: {
            'agent_name → name': 'Maps agent_name column to name field',
            'ai_model → model': 'Maps ai_model column to model field',
            'directory → workspace': 'Maps directory column to workspace field',
            'labels → tags': 'Maps labels column to tags field'
          }
        };

        return reply.send({
          success: true,
          data: formatInfo
        });
      } catch (error) {
        fastify.log.error('Format info failed:', error);
        return reply.code(500).send(createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          `Format info failed: ${(error as Error).message}`
        ));
      }
    }
  });
}