/**
 * Health Check Routes
 * System health and readiness endpoints
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';

export const HealthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Basic health check
  fastify.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'sso-service',
      version: '1.0.0'
    };
  });

  // Detailed health check
  fastify.get('/detailed', async (request, reply) => {
    const { database, redis } = request.dependencies;
    
    const checks = {
      database: await database.healthCheck(),
      redis: await redis.healthCheck(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    const isHealthy = checks.database && checks.redis;
    
    return reply
      .status(isHealthy ? 200 : 503)
      .send({
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks
      });
  });

  // Readiness probe for Kubernetes
  fastify.get('/ready', async (request, reply) => {
    const { database, redis } = request.dependencies;
    
    const ready = await database.healthCheck() && await redis.healthCheck();
    
    return reply
      .status(ready ? 200 : 503)
      .send({
        ready,
        timestamp: new Date().toISOString()
      });
  });

  // Liveness probe for Kubernetes
  fastify.get('/live', async (request, reply) => {
    return {
      alive: true,
      timestamp: new Date().toISOString()
    };
  });
};