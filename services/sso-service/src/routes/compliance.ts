/**
 * Compliance Routes
 * Audit logs, compliance reports, and regulatory requirements
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const ComplianceRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get audit logs
  fastify.get('/audit/logs', {
    schema: {
      description: 'Retrieve audit logs with filtering',
      tags: ['Compliance'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          userId: { type: 'string' },
          eventType: { type: 'string' },
          outcome: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'number', minimum: 1, maximum: 1000, default: 100 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { compliance } = request.dependencies;
    const filters = request.query as any;

    try {
      const result = await compliance.getAuditLogs(filters);
      
      return {
        logs: result.logs,
        total: result.total,
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to retrieve audit logs',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Generate compliance report
  fastify.post('/reports/generate', {
    schema: {
      description: 'Generate compliance report',
      tags: ['Compliance'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['framework'],
        properties: {
          framework: { 
            type: 'string', 
            enum: ['soc2_type2', 'hipaa', 'gdpr', 'iso27001', 'pci_dss', 'nist_csf']
          },
          tenantId: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, async (request, reply) => {
    const { compliance } = request.dependencies;
    const { framework, tenantId, startDate, endDate } = request.body as any;

    try {
      const report = await compliance.generateComplianceReport(
        framework,
        tenantId,
        startDate,
        endDate
      );

      await compliance.auditLog({
        eventType: 'compliance_event',
        action: 'report_generate',
        resource: `compliance_report:${framework}`,
        outcome: 'success',
        details: { framework, tenantId, reportId: report.id },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        tenantId
      });

      return {
        report,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to generate compliance report',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Validate compliance status
  fastify.get('/validate/:tenantId', {
    schema: {
      description: 'Validate compliance status for tenant',
      tags: ['Compliance'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        },
        required: ['tenantId']
      }
    }
  }, async (request, reply) => {
    const { compliance } = request.dependencies;
    const { tenantId } = request.params as any;

    try {
      const validation = await compliance.validateCompliance(tenantId);

      await compliance.auditLog({
        eventType: 'compliance_event',
        action: 'compliance_validate',
        resource: `tenant:${tenantId}`,
        outcome: validation.compliant ? 'success' : 'failure',
        details: {
          compliant: validation.compliant,
          score: validation.score,
          violationsCount: validation.violations.length
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        tenantId
      });

      return {
        ...validation,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to validate compliance',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get compliance metrics
  fastify.get('/metrics', {
    schema: {
      description: 'Get compliance metrics',
      tags: ['Compliance'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { compliance } = request.dependencies;
    const { tenantId } = request.query as any;

    try {
      const metrics = await compliance.getComplianceMetrics(tenantId);

      return {
        metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to retrieve compliance metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get available compliance reports
  fastify.get('/reports', {
    schema: {
      description: 'List available compliance reports',
      tags: ['Compliance'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    // TODO: Implement report listing
    return {
      reports: [],
      total: 0,
      timestamp: new Date().toISOString()
    };
  });
};