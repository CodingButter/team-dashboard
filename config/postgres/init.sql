-- Initialize team dashboard database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables for agent management
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tables for MCP server configurations
CREATE TABLE IF NOT EXISTS mcp_servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tables for system metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_timestamp ON system_metrics(metric_type, timestamp);

-- Insert some default data for development
INSERT INTO mcp_servers (name, config) VALUES 
('memento', '{"command": "npx", "args": ["-y", "@gannonh/memento-mcp"], "transport": "stdio"}'),
('filesystem', '{"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"], "transport": "stdio"}')
ON CONFLICT (name) DO NOTHING;