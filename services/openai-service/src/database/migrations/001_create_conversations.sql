-- Conversation memory system database schema
-- Supports full persistence, branching, and relevance-based message pruning

-- Main conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    parent_conversation_id UUID REFERENCES conversations(id),
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);

-- Messages table with enhanced features for relevance scoring
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    relevance_score DECIMAL(5, 4) DEFAULT 0.5,
    embedding VECTOR(1536), -- For semantic similarity (OpenAI ada-002 dimensions)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Conversation branches for forking support
CREATE TABLE IF NOT EXISTS conversation_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_conversation_id UUID NOT NULL REFERENCES conversations(id),
    target_conversation_id UUID NOT NULL REFERENCES conversations(id),
    branch_point_message_id UUID REFERENCES messages(id),
    branch_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_relevance ON messages(relevance_score);

-- Composite index for fast conversation retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Index for semantic search if pgvector is available
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Update trigger for conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function to calculate relevance score based on recency and semantic similarity
CREATE OR REPLACE FUNCTION calculate_relevance_score(
    message_created_at TIMESTAMP WITH TIME ZONE,
    message_embedding VECTOR(1536),
    context_embedding VECTOR(1536) DEFAULT NULL
) RETURNS DECIMAL(5, 4) AS $$
DECLARE
    recency_weight DECIMAL(5, 4) := 0.3;
    semantic_weight DECIMAL(5, 4) := 0.7;
    max_age_hours INTEGER := 168; -- 1 week
    
    age_hours DECIMAL;
    recency_score DECIMAL(5, 4);
    semantic_score DECIMAL(5, 4);
    final_score DECIMAL(5, 4);
BEGIN
    -- Calculate recency score (newer messages get higher scores)
    age_hours := EXTRACT(EPOCH FROM (NOW() - message_created_at)) / 3600;
    recency_score := GREATEST(0, 1 - (age_hours / max_age_hours));
    
    -- Calculate semantic score if embeddings are provided
    IF context_embedding IS NOT NULL AND message_embedding IS NOT NULL THEN
        semantic_score := 1 - (message_embedding <=> context_embedding);
        semantic_score := GREATEST(0, LEAST(1, semantic_score));
    ELSE
        semantic_score := 0.5; -- Default neutral score
    END IF;
    
    -- Combine scores
    final_score := (recency_weight * recency_score) + (semantic_weight * semantic_score);
    
    RETURN GREATEST(0, LEAST(1, final_score));
END;
$$ LANGUAGE plpgsql;