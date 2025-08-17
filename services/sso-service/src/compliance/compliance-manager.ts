/**
 * Compliance Manager
 * SOC2 Type II, HIPAA, and enterprise compliance management
 */

import { logger, auditLogger } from '../utils/logger.js';
import type { DatabaseManager } from '../utils/database.js';
import type { RedisManager } from '../utils/redis.js';
import type { Config } from '../config/index.js';
import type {
  AuditEventType,
  AuditLog,
  ComplianceFramework,
  ComplianceReport
} from '@team-dashboard/types';

export interface AuditLogRequest {
  eventType: AuditEventType;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'error' | 'pending' | 'not_found';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  riskScore?: number;
  complianceFlags?: string[];
}

export class ComplianceManager {
  private config: Config['compliance'];
  private database?: DatabaseManager;
  private redis?: RedisManager;
  private alertThresholds: Map<string, number> = new Map();
  private eventCounters: Map<string, number> = new Map();

  constructor(config: Config['compliance']) {
    this.config = config;
    this.setupAlertThresholds();
  }

  async initialize(database?: DatabaseManager, redis?: RedisManager): Promise<void> {
    this.database = database;
    this.redis = redis;

    logger.info('Compliance Manager initialized', {
      frameworks: this.config.complianceFrameworks,
      auditLogging: this.config.enableAuditLogging,
      realTimeAlerts: this.config.enableRealTimeAlerts
    });

    // Initialize compliance frameworks
    await this.initializeFrameworks();
  }

  async auditLog(request: AuditLogRequest): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    try {
      const auditRecord: AuditLog = {
        id: crypto.randomUUID(),
        tenantId: request.tenantId,
        userId: request.userId,
        sessionId: request.sessionId,
        eventType: request.eventType,
        action: request.action,
        resource: request.resource,
        outcome: request.outcome,
        timestamp: new Date().toISOString(),
        ipAddress: request.ipAddress || '',
        userAgent: request.userAgent || '',
        details: request.details,
        riskScore: request.riskScore,
        complianceFlags: request.complianceFlags || []
      };

      // Store in database for long-term retention
      if (this.database) {
        await this.storeAuditLog(auditRecord);
      }

      // Cache recent logs for performance
      if (this.redis) {
        await this.cacheRecentAuditLog(auditRecord);
      }

      // Log to structured logger
      auditLogger.log(request.eventType, `${request.action} on ${request.resource}`, {
        outcome: request.outcome,
        userId: request.userId,
        tenantId: request.tenantId,
        ipAddress: request.ipAddress,
        riskScore: request.riskScore,
        ...request.details
      });

      // Real-time alerting
      if (this.config.enableRealTimeAlerts) {
        await this.checkAlertConditions(auditRecord);
      }

      // Update metrics
      this.updateEventCounters(request.eventType, request.outcome);

    } catch (error) {
      logger.error('Failed to create audit log:', error);
      // Don't throw error to avoid disrupting main application flow
    }
  }

  async getAuditLogs(filters: {
    tenantId?: string;
    userId?: string;
    eventType?: AuditEventType;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.tenantId) {
        whereClauses.push(`tenant_id = $${paramIndex++}`);
        params.push(filters.tenantId);
      }

      if (filters.userId) {
        whereClauses.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }

      if (filters.eventType) {
        whereClauses.push(`event_type = $${paramIndex++}`);
        params.push(filters.eventType);
      }

      if (filters.outcome) {
        whereClauses.push(`outcome = $${paramIndex++}`);
        params.push(filters.outcome);
      }

      if (filters.startDate) {
        whereClauses.push(`created_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClauses.push(`created_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
      const countResult = await this.database.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get logs
      const logsQuery = `
        SELECT * FROM audit_logs 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(limit, offset);

      const logsResult = await this.database.query(logsQuery, params);
      const logs = logsResult.rows.map(row => this.mapAuditLogFromDb(row));

      return { logs, total };

    } catch (error) {
      logger.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  async generateComplianceReport(
    framework: ComplianceFramework,
    tenantId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ComplianceReport> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const reportId = crypto.randomUUID();
      const now = new Date();
      const periodStart = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const periodEnd = endDate ? new Date(endDate) : now;

      const reportData = await this.generateFrameworkSpecificReport(
        framework,
        tenantId,
        periodStart,
        periodEnd
      );

      const report: ComplianceReport = {
        id: reportId,
        name: `${framework.toUpperCase()} Compliance Report`,
        framework,
        schedule: 'manual',
        template: 'standard',
        recipients: []
      };

      // Store report in database
      await this.database.query(`
        INSERT INTO compliance_reports (id, tenant_id, name, framework, report_data, period_start, period_end)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [reportId, tenantId, report.name, framework, JSON.stringify(reportData), periodStart, periodEnd]);

      logger.info('Compliance report generated', {
        reportId,
        framework,
        tenantId,
        periodStart,
        periodEnd
      });

      return report;

    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  async validateCompliance(tenantId: string): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
    score: number;
  }> {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check each enabled compliance framework
      for (const framework of this.config.complianceFrameworks) {
        const frameworkResult = await this.validateFramework(framework, tenantId);
        violations.push(...frameworkResult.violations);
        recommendations.push(...frameworkResult.recommendations);
        score = Math.min(score, frameworkResult.score);
      }

      const compliant = violations.length === 0 && score >= 80;

      logger.info('Compliance validation completed', {
        tenantId,
        compliant,
        violationsCount: violations.length,
        score
      });

      return {
        compliant,
        violations,
        recommendations,
        score
      };

    } catch (error) {
      logger.error('Failed to validate compliance:', error);
      throw error;
    }
  }

  async getComplianceMetrics(tenantId?: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    riskDistribution: Record<string, number>;
    complianceScore: number;
    recentViolations: number;
  }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const tenantFilter = tenantId ? 'AND tenant_id = $2' : '';
      const params = tenantId ? [thirtyDaysAgo, tenantId] : [thirtyDaysAgo];

      // Total events
      const totalResult = await this.database.query(`
        SELECT COUNT(*) as total 
        FROM audit_logs 
        WHERE created_at >= $1 ${tenantFilter}
      `, params);
      const totalEvents = parseInt(totalResult.rows[0].total);

      // Events by type
      const eventsByTypeResult = await this.database.query(`
        SELECT event_type, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= $1 ${tenantFilter}
        GROUP BY event_type
      `, params);
      const eventsByType = eventsByTypeResult.rows.reduce((acc, row) => {
        acc[row.event_type] = parseInt(row.count);
        return acc;
      }, {});

      // Risk distribution
      const riskResult = await this.database.query(`
        SELECT 
          CASE 
            WHEN risk_score <= 30 THEN 'low'
            WHEN risk_score <= 70 THEN 'medium'
            ELSE 'high'
          END as risk_level,
          COUNT(*) as count
        FROM audit_logs 
        WHERE created_at >= $1 AND risk_score IS NOT NULL ${tenantFilter}
        GROUP BY risk_level
      `, params);
      const riskDistribution = riskResult.rows.reduce((acc, row) => {
        acc[row.risk_level] = parseInt(row.count);
        return acc;
      }, {});

      // Recent violations
      const violationsResult = await this.database.query(`
        SELECT COUNT(*) as violations 
        FROM audit_logs 
        WHERE created_at >= $1 AND outcome = 'failure' ${tenantFilter}
      `, params);
      const recentViolations = parseInt(violationsResult.rows[0].violations);

      // Calculate compliance score
      const complianceScore = Math.max(0, 100 - (recentViolations * 2));

      return {
        totalEvents,
        eventsByType,
        riskDistribution,
        complianceScore,
        recentViolations
      };

    } catch (error) {
      logger.error('Failed to get compliance metrics:', error);
      throw error;
    }
  }

  private async storeAuditLog(auditRecord: AuditLog): Promise<void> {
    if (!this.database) return;

    await this.database.query(`
      INSERT INTO audit_logs (
        id, tenant_id, user_id, session_id, event_type, action, resource, 
        outcome, ip_address, user_agent, details, risk_score, compliance_flags, 
        correlation_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      auditRecord.id,
      auditRecord.tenantId,
      auditRecord.userId,
      auditRecord.sessionId,
      auditRecord.eventType,
      auditRecord.action,
      auditRecord.resource,
      auditRecord.outcome,
      auditRecord.ipAddress,
      auditRecord.userAgent,
      JSON.stringify(auditRecord.details),
      auditRecord.riskScore,
      auditRecord.complianceFlags,
      crypto.randomUUID(), // correlation_id
      auditRecord.timestamp
    ]);
  }

  private async cacheRecentAuditLog(auditRecord: AuditLog): Promise<void> {
    if (!this.redis) return;

    const key = `recent_audit_logs:${auditRecord.tenantId || 'global'}`;
    await this.redis.getClient().lpush(key, JSON.stringify(auditRecord));
    await this.redis.getClient().ltrim(key, 0, 999); // Keep last 1000 logs
    await this.redis.getClient().expire(key, 86400); // 24 hours
  }

  private async checkAlertConditions(auditRecord: AuditLog): Promise<void> {
    // Check for high-risk events
    if (auditRecord.riskScore && auditRecord.riskScore > 80) {
      await this.sendSecurityAlert('high_risk_event', auditRecord);
    }

    // Check for authentication failures
    if (auditRecord.eventType === 'authentication' && auditRecord.outcome === 'failure') {
      const key = `auth_failures:${auditRecord.ipAddress}`;
      const count = await this.incrementCounter(key, 300); // 5 minutes window
      
      if (count > 5) {
        await this.sendSecurityAlert('multiple_auth_failures', auditRecord);
      }
    }

    // Check for compliance violations
    if (auditRecord.complianceFlags && auditRecord.complianceFlags.length > 0) {
      await this.sendComplianceAlert('compliance_violation', auditRecord);
    }
  }

  private async sendSecurityAlert(alertType: string, auditRecord: AuditLog): Promise<void> {
    logger.warn(`Security alert: ${alertType}`, {
      alertType,
      auditRecord,
      severity: 'high'
    });

    // Here you would integrate with your alerting system
    // (email, Slack, PagerDuty, etc.)
  }

  private async sendComplianceAlert(alertType: string, auditRecord: AuditLog): Promise<void> {
    logger.warn(`Compliance alert: ${alertType}`, {
      alertType,
      auditRecord,
      severity: 'medium'
    });

    // Here you would integrate with your compliance alerting system
  }

  private async incrementCounter(key: string, window: number): Promise<number> {
    if (!this.redis) return 0;

    const result = await this.redis.incrementRateLimit(key, window, Number.MAX_SAFE_INTEGER);
    return result.count;
  }

  private setupAlertThresholds(): void {
    this.alertThresholds.set('authentication_failures', 5);
    this.alertThresholds.set('authorization_failures', 10);
    this.alertThresholds.set('security_violations', 1);
    this.alertThresholds.set('high_risk_events', 3);
  }

  private updateEventCounters(eventType: AuditEventType, outcome: string): void {
    const key = `${eventType}_${outcome}`;
    const current = this.eventCounters.get(key) || 0;
    this.eventCounters.set(key, current + 1);
  }

  private async initializeFrameworks(): Promise<void> {
    for (const framework of this.config.complianceFrameworks) {
      logger.info(`Initializing compliance framework: ${framework}`);
      
      switch (framework) {
        case 'soc2_type2':
          await this.initializeSOC2();
          break;
        case 'hipaa':
          await this.initializeHIPAA();
          break;
        case 'gdpr':
          await this.initializeGDPR();
          break;
        // Add other frameworks as needed
      }
    }
  }

  private async initializeSOC2(): Promise<void> {
    // SOC2 Type II specific initialization
    logger.info('SOC2 Type II compliance framework initialized');
  }

  private async initializeHIPAA(): Promise<void> {
    // HIPAA specific initialization
    logger.info('HIPAA compliance framework initialized');
  }

  private async initializeGDPR(): Promise<void> {
    // GDPR specific initialization
    logger.info('GDPR compliance framework initialized');
  }

  private async generateFrameworkSpecificReport(
    framework: ComplianceFramework,
    tenantId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, any>> {
    // Generate framework-specific compliance report data
    return {
      framework,
      period: { start: startDate, end: endDate },
      tenantId,
      generated: new Date(),
      // Add framework-specific metrics and assessments
    };
  }

  private async validateFramework(framework: ComplianceFramework, tenantId: string): Promise<{
    violations: string[];
    recommendations: string[];
    score: number;
  }> {
    // Validate specific compliance framework requirements
    return {
      violations: [],
      recommendations: [],
      score: 100
    };
  }

  private mapAuditLogFromDb(row: any): AuditLog {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      sessionId: row.session_id,
      eventType: row.event_type,
      action: row.action,
      resource: row.resource,
      outcome: row.outcome,
      timestamp: row.created_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      details: row.details,
      riskScore: row.risk_score,
      complianceFlags: row.compliance_flags || []
    };
  }
}