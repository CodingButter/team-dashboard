/**
 * @service mcp-manager/routes
 * Routes for MCP server templates and marketplace
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { MCP_SERVER_TEMPLATES, MCP_CATEGORIES } from '@team-dashboard/types'

export async function templateRoutes(fastify: FastifyInstance) {
  
  // Get all available templates
  fastify.get('/templates', async (request: FastifyRequest<{
    Querystring: { category?: string; search?: string }
  }>, reply: FastifyReply) => {
    try {
      let templates = [...MCP_SERVER_TEMPLATES]
      
      // Filter by category
      if (request.query.category && request.query.category !== 'All') {
        templates = templates.filter(t => t.category === request.query.category)
      }
      
      // Search filter
      if (request.query.search) {
        const searchTerm = request.query.search.toLowerCase()
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(searchTerm) ||
          t.description.toLowerCase().includes(searchTerm) ||
          t.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        )
      }
      
      // Sort by popularity
      templates.sort((a, b) => b.popularity - a.popularity)

      return {
        success: true,
        data: templates
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve templates'
      })
    }
  })

  // Get template by ID
  fastify.get('/templates/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const template = MCP_SERVER_TEMPLATES.find(t => t.id === request.params.id)
      
      if (!template) {
        return reply.code(404).send({
          success: false,
          error: 'Template not found'
        })
      }

      return {
        success: true,
        data: template
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve template'
      })
    }
  })

  // Get template categories
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return {
        success: true,
        data: MCP_CATEGORIES
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve categories'
      })
    }
  })
}