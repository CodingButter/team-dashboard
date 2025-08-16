# MCP (Model Context Protocol) Integration Guide

## Overview

The Team Dashboard now includes comprehensive MCP server management capabilities, allowing users to configure and manage external tools and services that extend their Claude Code agents' capabilities.

## Architecture

### Components

1. **MCP Manager Service** (`services/mcp-manager/`)
   - REST API for server configuration management
   - STDIO and HTTP+SSE transport implementations
   - Redis-based storage for configuration and status
   - Real-time health monitoring and status tracking

2. **Type Definitions** (`packages/types/src/mcp/`)
   - TypeScript interfaces for MCP server configurations
   - API contracts for REST endpoints
   - Template definitions for popular MCP servers

3. **UI Components** (`apps/dashboard/src/components/mcp/`)
   - Server configuration forms with template support
   - Server marketplace for discovery and installation
   - Real-time status indicators and health monitoring
   - Credential management with encryption

4. **Dashboard Integration** (`apps/dashboard/src/app/mcp/`)
   - Complete MCP management interface
   - Integrated navigation and user experience

## Key Features

### 🔧 Server Configuration
- **Multiple Transport Types**: Support for STDIO and HTTP+SSE protocols
- **Template System**: Pre-configured templates for popular MCP servers
- **Environment Management**: Secure handling of API keys and credentials
- **Validation**: Real-time configuration validation and testing

### 🏪 Server Marketplace
- **Curated Templates**: Verified MCP servers from the community
- **Category Filtering**: Browse by Development, Database, Automation, etc.
- **Search & Discovery**: Find servers by name, description, or capabilities
- **One-Click Installation**: Easy setup with pre-configured templates

### 📊 Monitoring & Health
- **Real-time Status**: Live connection status and health monitoring
- **Performance Metrics**: Request counts, error rates, and uptime tracking
- **Capability Discovery**: Automatic detection of available tools and resources
- **Error Reporting**: Detailed error messages and troubleshooting

### 🔒 Security
- **Credential Encryption**: AES-256 encryption for sensitive environment variables
- **Secure Storage**: Redis-based storage with encryption at rest
- **Access Control**: Integration with dashboard authentication system
- **Audit Logging**: Complete audit trail for all operations

## Supported MCP Servers

### Verified Templates

1. **GitHub** (`@modelcontextprotocol/server-github`)
   - Repository management and file operations
   - Issue and PR management
   - Code analysis and search

2. **PostgreSQL** (`@modelcontextprotocol/server-postgres`)
   - Database schema inspection
   - SQL query execution
   - Data analysis and reporting

3. **Puppeteer** (`@modelcontextprotocol/server-puppeteer`)
   - Browser automation and web scraping
   - Screenshot capture and PDF generation
   - Form filling and interaction

### Transport Support

- **STDIO**: Local command execution (recommended for most servers)
- **HTTP+SSE**: Remote server connections with Server-Sent Events

## Configuration Examples

### GitHub MCP Server

```json
{
  "name": "GitHub Integration",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "environment": [
    {
      "key": "GITHUB_PERSONAL_ACCESS_TOKEN",
      "value": "ghp_xxxxxxxxxxxxxxxxxxxx",
      "encrypted": true
    }
  ],
  "autoConnect": true,
  "enabled": true
}
```

### PostgreSQL MCP Server

```json
{
  "name": "Production Database",
  "transport": "stdio", 
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "environment": [
    {
      "key": "POSTGRES_CONNECTION_STRING",
      "value": "postgresql://user:pass@localhost:5432/db",
      "encrypted": true
    }
  ],
  "autoConnect": false,
  "enabled": true
}
```

## API Reference

### Base URL
```
http://localhost:3003/api/mcp
```

### Endpoints

#### Server Management
- `GET /servers` - List all configured servers
- `POST /servers` - Create new server configuration
- `GET /servers/:id` - Get server details
- `PUT /servers/:id` - Update server configuration
- `DELETE /servers/:id` - Delete server

#### Server Operations
- `POST /servers/:id/connect` - Connect to server
- `POST /servers/:id/disconnect` - Disconnect from server
- `POST /servers/:id/test` - Test server connection
- `GET /servers/:id/health` - Get server health status

#### Templates & Discovery
- `GET /templates` - List available server templates
- `GET /templates/:id` - Get template details
- `GET /categories` - List template categories

#### Status & Monitoring
- `GET /status` - Get status for all servers
- `GET /overview` - Get comprehensive status overview
- `GET /health` - Service health check

## Development Setup

### Prerequisites
- Node.js >= 20.0.0
- Redis server running
- Docker (for infrastructure services)

### Installation

1. **Install Dependencies**
   ```bash
   cd services/mcp-manager
   pnpm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Configure required variables
   MCP_MANAGER_PORT=3003
   REDIS_HOST=localhost
   REDIS_PORT=6379
   MCP_ENCRYPTION_KEY=your-secure-encryption-key
   ```

3. **Start Development Server**
   ```bash
   pnpm dev
   ```

### Testing

Run the test suite:
```bash
pnpm test
```

Test server connectivity:
```bash
curl http://localhost:3003/health
```

## Integration with Agents

MCP servers configured through the dashboard are automatically available to all Claude Code agents running in the system. Agents can discover and use MCP tools through the standard MCP protocol.

### Agent Configuration

Agents automatically inherit MCP server configurations based on:
- **Global Settings**: Servers marked as "auto-connect"
- **Project Context**: Servers relevant to the current workspace
- **User Preferences**: User-specific server configurations

### Tool Discovery

When an agent starts, it automatically:
1. Connects to enabled MCP servers
2. Discovers available tools and resources
3. Registers capabilities with the agent runtime
4. Provides tools to the Claude Code instance

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check server credentials and environment variables
   - Verify network connectivity for HTTP+SSE servers
   - Ensure required dependencies are installed for STDIO servers

2. **Permission Errors**
   - Verify API keys have required permissions
   - Check file system permissions for STDIO servers
   - Ensure Redis connectivity and permissions

3. **Performance Issues**
   - Monitor health check metrics
   - Check server resource usage
   - Review error logs for bottlenecks

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug pnpm dev
```

### Health Monitoring

Monitor server health through:
- Dashboard UI real-time indicators
- `/api/mcp/status` endpoint
- Service logs and metrics

## Security Considerations

### Credential Management
- All sensitive environment variables are encrypted at rest
- Credentials are never logged or exposed in responses
- Encryption keys should be rotated regularly

### Network Security
- HTTP+SSE connections should use HTTPS in production
- Consider VPN or private networks for sensitive servers
- Implement rate limiting and authentication for remote servers

### Access Control
- Integrate with existing RBAC system
- Audit all configuration changes
- Implement approval workflows for production servers

## Future Enhancements

### Planned Features
- **Server Templates Store**: Community-driven template marketplace
- **Advanced Monitoring**: Metrics, alerting, and dashboard integration
- **Batch Operations**: Bulk server management and deployment
- **Workflow Integration**: MCP servers in automated workflows
- **Custom Transports**: Support for additional transport protocols

### Integration Opportunities
- **CI/CD Integration**: MCP servers in build and deployment pipelines
- **Monitoring Stack**: Integration with Prometheus and Grafana
- **Agent Orchestration**: Advanced routing and load balancing
- **Multi-tenant Support**: Organization-level server management

## Support

For issues, questions, or contributions:
- Review this documentation and API reference
- Check server logs and health endpoints
- Test configurations with the built-in test functionality
- Monitor performance through the dashboard metrics