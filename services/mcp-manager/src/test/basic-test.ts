/**
 * @service mcp-manager/test
 * Basic integration tests for MCP manager
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '../index'
import { FastifyInstance } from 'fastify'

describe('MCP Manager Service', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createServer()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('should respond to health check', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    })
    
    expect(response.statusCode).toBe(200)
    const payload = JSON.parse(response.payload)
    expect(payload.status).toBe('healthy')
    expect(payload.service).toBe('mcp-manager')
  })

  it('should list templates', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/mcp/templates'
    })
    
    expect(response.statusCode).toBe(200)
    const payload = JSON.parse(response.payload)
    expect(payload.success).toBe(true)
    expect(Array.isArray(payload.data)).toBe(true)
    expect(payload.data.length).toBeGreaterThan(0)
  })

  it('should return empty server list initially', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/mcp/servers'
    })
    
    expect(response.statusCode).toBe(200)
    const payload = JSON.parse(response.payload)
    expect(payload.success).toBe(true)
    expect(Array.isArray(payload.data)).toBe(true)
  })

  it('should return status overview', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/mcp/overview'
    })
    
    expect(response.statusCode).toBe(200)
    const payload = JSON.parse(response.payload)
    expect(payload.success).toBe(true)
    expect(payload.data).toHaveProperty('totalServers')
    expect(payload.data).toHaveProperty('enabledServers')
  })
})