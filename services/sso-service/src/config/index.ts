/**
 * SSO Service Configuration
 * Centralized configuration management for Enterprise SSO
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema validation
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().min(1).max(65535).default(3006),
    host: z.string().default('0.0.0.0'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    baseUrl: z.string().url(),
    trustedProxies: z.array(z.string()).default([]),
    cors: z.object({
      origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
      credentials: z.boolean().default(true),
      methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
      allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization', 'X-Tenant-ID'])
    })
  }),
  
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    database: z.string().default('team_dashboard_sso'),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean().default(false),
    maxConnections: z.number().default(20),
    idleTimeoutMillis: z.number().default(30000),
    connectionTimeoutMillis: z.number().default(2000)
  }),
  
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
    maxRetriesPerRequest: z.number().default(3),
    retryDelayOnFailover: z.number().default(100),
    enableReadyCheck: z.boolean().default(true),
    maxRetriesPerRequest: z.number().default(3)
  }),
  
  sso: z.object({
    entityId: z.string(),
    certificatePath: z.string(),
    privateKeyPath: z.string(),
    defaultSessionTimeout: z.number().default(1440), // 24 hours in minutes
    maxConcurrentSessions: z.number().default(10),
    enableIdpInitiated: z.boolean().default(true),
    signatureAlgorithm: z.enum(['sha1', 'sha256']).default('sha256'),
    digestAlgorithm: z.enum(['sha1', 'sha256']).default('sha256')
  }),
  
  security: z.object({
    jwtSecret: z.string(),
    jwtExpiresIn: z.string().default('1h'),
    jwtRefreshExpiresIn: z.string().default('7d'),
    bcryptRounds: z.number().min(10).max(15).default(12),
    rateLimiting: z.object({
      max: z.number().default(100),
      timeWindow: z.string().default('15 minutes'),
      skipSuccessfulRequests: z.boolean().default(false),
      skipFailedRequests: z.boolean().default(false)
    }),
    helmet: z.object({
      contentSecurityPolicy: z.boolean().default(true),
      crossOriginEmbedderPolicy: z.boolean().default(false),
      crossOriginOpenerPolicy: z.boolean().default(true),
      crossOriginResourcePolicy: z.boolean().default(true),
      dnsPrefetchControl: z.boolean().default(true),
      frameguard: z.boolean().default(true),
      hidePoweredBy: z.boolean().default(true),
      hsts: z.boolean().default(true),
      ieNoOpen: z.boolean().default(true),
      noSniff: z.boolean().default(true),
      originAgentCluster: z.boolean().default(true),
      permittedCrossDomainPolicies: z.boolean().default(false),
      referrerPolicy: z.boolean().default(true),
      xssFilter: z.boolean().default(true)
    })
  }),
  
  compliance: z.object({
    enableAuditLogging: z.boolean().default(true),
    auditLogLevel: z.enum(['minimal', 'standard', 'detailed', 'comprehensive']).default('standard'),
    auditRetentionDays: z.number().default(2555), // 7 years
    enableRealTimeAlerts: z.boolean().default(true),
    complianceFrameworks: z.array(z.enum(['soc2_type2', 'hipaa', 'gdpr', 'iso27001', 'pci_dss', 'nist_csf']))
      .default(['soc2_type2', 'hipaa']),
    dataClassification: z.object({
      pii: z.enum(['required', 'recommended', 'optional']).default('required'),
      phi: z.enum(['required', 'recommended', 'optional']).default('required'),
      confidential: z.enum(['required', 'recommended', 'optional']).default('required')
    }),
    encryption: z.object({
      algorithm: z.string().default('aes-256-gcm'),
      keyRotationDays: z.number().default(90),
      keyManagement: z.enum(['internal', 'aws_kms', 'azure_vault', 'hashicorp_vault']).default('internal')
    })
  }),
  
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsEndpoint: z.string().default('/metrics'),
    enableHealthCheck: z.boolean().default(true),
    healthCheckEndpoint: z.string().default('/health'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    logFormat: z.enum(['json', 'text']).default('json')
  }),
  
  notifications: z.object({
    enableEmail: z.boolean().default(true),
    enableWebhooks: z.boolean().default(true),
    enableSlack: z.boolean().default(false),
    smtp: z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      secure: z.boolean().default(true),
      username: z.string().optional(),
      password: z.string().optional(),
      from: z.string().optional()
    }).optional(),
    webhook: z.object({
      defaultUrl: z.string().url().optional(),
      timeout: z.number().default(5000),
      retries: z.number().default(3)
    }).optional()
  })
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    const config = ConfigSchema.parse({
      server: {
        port: parseInt(process.env.SSO_PORT || '3006'),
        host: process.env.SSO_HOST || '0.0.0.0',
        environment: process.env.NODE_ENV || 'development',
        baseUrl: process.env.SSO_BASE_URL || 'http://localhost:3006',
        trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
        cors: {
          origin: process.env.CORS_ORIGIN || true,
          credentials: process.env.CORS_CREDENTIALS === 'true',
          methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-Tenant-ID']
        }
      },
      
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_DATABASE || 'team_dashboard_sso',
        username: process.env.DB_USERNAME || '',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
      },
      
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
        enableReadyCheck: process.env.REDIS_READY_CHECK !== 'false'
      },
      
      sso: {
        entityId: process.env.SSO_ENTITY_ID || 'team-dashboard-sso',
        certificatePath: process.env.SSO_CERTIFICATE_PATH || './certs/cert.pem',
        privateKeyPath: process.env.SSO_PRIVATE_KEY_PATH || './certs/key.pem',
        defaultSessionTimeout: parseInt(process.env.SSO_SESSION_TIMEOUT || '1440'),
        maxConcurrentSessions: parseInt(process.env.SSO_MAX_SESSIONS || '10'),
        enableIdpInitiated: process.env.SSO_ENABLE_IDP_INITIATED !== 'false',
        signatureAlgorithm: (process.env.SSO_SIGNATURE_ALGORITHM as 'sha1' | 'sha256') || 'sha256',
        digestAlgorithm: (process.env.SSO_DIGEST_ALGORITHM as 'sha1' | 'sha256') || 'sha256'
      },
      
      security: {
        jwtSecret: process.env.JWT_SECRET || '',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        rateLimiting: {
          max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
          timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
          skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
          skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
        },
        helmet: {
          contentSecurityPolicy: process.env.HELMET_CSP !== 'false',
          crossOriginEmbedderPolicy: process.env.HELMET_COEP === 'true',
          crossOriginOpenerPolicy: process.env.HELMET_COOP !== 'false',
          crossOriginResourcePolicy: process.env.HELMET_CORP !== 'false',
          dnsPrefetchControl: process.env.HELMET_DNS_PREFETCH !== 'false',
          frameguard: process.env.HELMET_FRAMEGUARD !== 'false',
          hidePoweredBy: process.env.HELMET_HIDE_POWERED_BY !== 'false',
          hsts: process.env.HELMET_HSTS !== 'false',
          ieNoOpen: process.env.HELMET_IE_NO_OPEN !== 'false',
          noSniff: process.env.HELMET_NO_SNIFF !== 'false',
          originAgentCluster: process.env.HELMET_ORIGIN_AGENT_CLUSTER !== 'false',
          permittedCrossDomainPolicies: process.env.HELMET_PERMITTED_CROSS_DOMAIN === 'true',
          referrerPolicy: process.env.HELMET_REFERRER_POLICY !== 'false',
          xssFilter: process.env.HELMET_XSS_FILTER !== 'false'
        }
      },
      
      compliance: {
        enableAuditLogging: process.env.COMPLIANCE_AUDIT_LOGGING !== 'false',
        auditLogLevel: (process.env.COMPLIANCE_AUDIT_LEVEL as any) || 'standard',
        auditRetentionDays: parseInt(process.env.COMPLIANCE_AUDIT_RETENTION || '2555'),
        enableRealTimeAlerts: process.env.COMPLIANCE_REAL_TIME_ALERTS !== 'false',
        complianceFrameworks: process.env.COMPLIANCE_FRAMEWORKS?.split(',') || ['soc2_type2', 'hipaa'],
        dataClassification: {
          pii: (process.env.COMPLIANCE_PII_CLASSIFICATION as any) || 'required',
          phi: (process.env.COMPLIANCE_PHI_CLASSIFICATION as any) || 'required',
          confidential: (process.env.COMPLIANCE_CONFIDENTIAL_CLASSIFICATION as any) || 'required'
        },
        encryption: {
          algorithm: process.env.COMPLIANCE_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
          keyRotationDays: parseInt(process.env.COMPLIANCE_KEY_ROTATION_DAYS || '90'),
          keyManagement: (process.env.COMPLIANCE_KEY_MANAGEMENT as any) || 'internal'
        }
      },
      
      monitoring: {
        enableMetrics: process.env.MONITORING_METRICS !== 'false',
        metricsEndpoint: process.env.MONITORING_METRICS_ENDPOINT || '/metrics',
        enableHealthCheck: process.env.MONITORING_HEALTH_CHECK !== 'false',
        healthCheckEndpoint: process.env.MONITORING_HEALTH_ENDPOINT || '/health',
        logLevel: (process.env.LOG_LEVEL as any) || 'info',
        logFormat: (process.env.LOG_FORMAT as any) || 'json'
      },
      
      notifications: {
        enableEmail: process.env.NOTIFICATIONS_EMAIL !== 'false',
        enableWebhooks: process.env.NOTIFICATIONS_WEBHOOKS !== 'false',
        enableSlack: process.env.NOTIFICATIONS_SLACK === 'true',
        smtp: process.env.SMTP_HOST ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          username: process.env.SMTP_USERNAME,
          password: process.env.SMTP_PASSWORD,
          from: process.env.SMTP_FROM
        } : undefined,
        webhook: process.env.WEBHOOK_DEFAULT_URL ? {
          defaultUrl: process.env.WEBHOOK_DEFAULT_URL,
          timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'),
          retries: parseInt(process.env.WEBHOOK_RETRIES || '3')
        } : undefined
      }
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation errors:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('Configuration parsing error:', error);
    }
    process.exit(1);
  }
};

export const config = parseConfig();
export type Config = z.infer<typeof ConfigSchema>;