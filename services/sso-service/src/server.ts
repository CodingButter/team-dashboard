/**
 * SSO Service Server
 * Fastify-based HTTP server with enterprise security and compliance features
 */

import Fastify, { FastifyInstance, FastifyPluginOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import type { Config } from './config/index.js';
import type { DatabaseManager } from './utils/database.js';
import type { RedisManager } from './utils/redis.js';
import type { ComplianceManager } from './compliance/compliance-manager.js';

import { logger } from './utils/logger.js';
import { AuthenticationRoutes } from './routes/authentication.js';
import { ProviderRoutes } from './routes/providers.js';
import { TenantRoutes } from './routes/tenants.js';
import { ComplianceRoutes } from './routes/compliance.js';
import { HealthRoutes } from './routes/health.js';
import { MetricsRoutes } from './routes/metrics.js';

export interface ServerDependencies {
  database: DatabaseManager;
  redis: RedisManager;
  compliance: ComplianceManager;
}

export class SSOServer {
  private fastify: FastifyInstance;
  private config: Config['server'];
  private dependencies: ServerDependencies;

  constructor(config: Config['server'], dependencies: ServerDependencies) {
    this.config = config;
    this.dependencies = dependencies;
    this.fastify = Fastify({
      logger: {
        level: 'info',
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: req.headers,
            remoteAddress: req.socket?.remoteAddress,
            remotePort: req.socket?.remotePort
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: res.getHeaders()
          })
        }
      },
      trustProxy: this.config.trustedProxies.length > 0 ? this.config.trustedProxies : false,
      disableRequestLogging: false,
      requestIdHeader: 'x-request-id',
      requestIdLogLabel: 'reqId'
    });
  }

  async start(): Promise<void> {
    try {
      await this.registerPlugins();
      await this.registerRoutes();
      await this.registerErrorHandlers();
      
      const address = await this.fastify.listen({
        port: this.config.port,
        host: this.config.host
      });
      
      logger.info(`SSO Server listening at ${address}`);
      
    } catch (error) {
      logger.error('Failed to start SSO server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      logger.info('SSO Server stopped');
    } catch (error) {
      logger.error('Error stopping SSO server:', error);
      throw error;
    }
  }

  private async registerPlugins(): Promise<void> {
    // Security plugins
    await this.fastify.register(helmet, {
      contentSecurityPolicy: this.config.environment === 'production' ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          manifestSrc: ["'self'"],
          mediaSrc: ["'self'"],
          workerSrc: ["'none'"]
        }
      } : false
    });

    // CORS configuration
    await this.fastify.register(cors, {
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowedHeaders
    });

    // Rate limiting
    await this.fastify.register(rateLimit, {
      max: 100,
      timeWindow: '15 minutes',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (request) => {
        const tenantId = request.headers['x-tenant-id'] as string;
        const clientIp = request.ip;
        return tenantId ? `${tenantId}:${clientIp}` : clientIp;
      },
      errorResponseBuilder: (request, context) => ({
        error: 'Rate limit exceeded',
        message: `Too many requests, retry after ${context.ttl} milliseconds`,
        statusCode: 429,
        ttl: context.ttl
      }),
      onBanReach: (req, key) => {
        logger.warn(`Rate limit ban reached for key: ${key}`, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          tenantId: req.headers['x-tenant-id']
        });
      }
    });

    // JWT authentication
    await this.fastify.register(jwt, {
      secret: process.env.JWT_SECRET!,
      sign: {
        expiresIn: '1h',
        algorithm: 'HS256'
      },
      verify: {
        algorithms: ['HS256']
      }
    });

    // Swagger documentation
    if (this.config.environment !== 'production') {
      await this.fastify.register(swagger, {
        openapi: {
          openapi: '3.0.0',
          info: {
            title: 'Enterprise SSO API',
            description: 'SAML 2.0, LDAP, and Multi-Tenant Authentication Service',
            version: '1.0.0',
            contact: {
              name: 'Team Dashboard Development Team',
              email: 'dev@team-dashboard.com'
            },
            license: {
              name: 'MIT',
              url: 'https://opensource.org/licenses/MIT'
            }
          },
          servers: [
            {
              url: this.config.baseUrl,
              description: 'SSO Service'
            }
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
              },
              tenantHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'X-Tenant-ID'
              }
            }
          },
          security: [
            { bearerAuth: [] },
            { tenantHeader: [] }
          ]
        }
      });

      await this.fastify.register(swaggerUi, {
        routePrefix: '/documentation',
        uiConfig: {
          docExpansion: 'full',
          deepLinking: false
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        transformSpecification: (swaggerObject) => swaggerObject,
        transformSpecificationClone: true
      });
    }

    // Request/response interceptors for compliance
    this.fastify.addHook('onRequest', async (request, reply) => {
      // Add correlation ID
      if (!request.headers['x-correlation-id']) {
        request.headers['x-correlation-id'] = `sso-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Compliance audit logging
      await this.dependencies.compliance.auditLog({
        eventType: 'api_request',
        action: `${request.method} ${request.url}`,
        resource: request.url,
        outcome: 'pending',
        details: {
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          correlationId: request.headers['x-correlation-id'],
          tenantId: request.headers['x-tenant-id']
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        tenantId: request.headers['x-tenant-id'] as string
      });
    });

    this.fastify.addHook('onResponse', async (request, reply) => {
      // Log response for compliance
      await this.dependencies.compliance.auditLog({
        eventType: 'api_response',
        action: `${request.method} ${request.url}`,
        resource: request.url,
        outcome: reply.statusCode < 400 ? 'success' : 'failure',
        details: {
          statusCode: reply.statusCode,
          responseTime: reply.getResponseTime(),
          correlationId: request.headers['x-correlation-id']
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        tenantId: request.headers['x-tenant-id'] as string
      });
    });

    // Context decorator for dependency injection
    this.fastify.decorateRequest('dependencies', null);
    this.fastify.addHook('onRequest', async (request) => {
      request.dependencies = this.dependencies;
    });
  }

  private async registerRoutes(): Promise<void> {
    // Health and monitoring routes
    await this.fastify.register(HealthRoutes, { prefix: '/health' });
    await this.fastify.register(MetricsRoutes, { prefix: '/metrics' });

    // SSO API routes
    await this.fastify.register(AuthenticationRoutes, { prefix: '/api/sso/auth' });
    await this.fastify.register(ProviderRoutes, { prefix: '/api/sso/providers' });
    await this.fastify.register(TenantRoutes, { prefix: '/api/sso/tenants' });
    await this.fastify.register(ComplianceRoutes, { prefix: '/api/sso/compliance' });

    // Root route
    this.fastify.get('/', async (request, reply) => {
      return {
        service: 'Enterprise SSO Service',
        version: '1.0.0',
        status: 'running',
        environment: this.config.environment,
        documentation: this.config.environment !== 'production' ? `${this.config.baseUrl}/documentation` : undefined,
        timestamp: new Date().toISOString()
      };
    });
  }

  private async registerErrorHandlers(): Promise<void> {
    // Global error handler
    this.fastify.setErrorHandler(async (error, request, reply) => {
      // Log error for compliance
      await this.dependencies.compliance.auditLog({
        eventType: 'system_error',
        action: `error_${error.name}`,
        resource: request.url,
        outcome: 'error',
        details: {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          correlationId: request.headers['x-correlation-id']
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        tenantId: request.headers['x-tenant-id'] as string
      });

      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        correlationId: request.headers['x-correlation-id']
      });

      // Don't expose internal errors in production
      const statusCode = error.statusCode || 500;
      const message = this.config.environment === 'production' && statusCode === 500
        ? 'Internal Server Error'
        : error.message;

      return reply.status(statusCode).send({
        error: true,
        message,
        statusCode,
        correlationId: request.headers['x-correlation-id'],
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.fastify.setNotFoundHandler(async (request, reply) => {
      await this.dependencies.compliance.auditLog({
        eventType: 'not_found',
        action: `${request.method} ${request.url}`,
        resource: request.url,
        outcome: 'not_found',
        details: {
          correlationId: request.headers['x-correlation-id']
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] as string,
        tenantId: request.headers['x-tenant-id'] as string
      });

      return reply.status(404).send({
        error: true,
        message: 'Not Found',
        statusCode: 404,
        correlationId: request.headers['x-correlation-id'],
        timestamp: new Date().toISOString()
      });
    });
  }

  public getInstance(): FastifyInstance {
    return this.fastify;
  }
}

// Extend Fastify types for dependency injection
declare module 'fastify' {
  interface FastifyRequest {
    dependencies: ServerDependencies;
  }
}