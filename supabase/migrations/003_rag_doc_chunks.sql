-- RAG document chunks: store embeddings per chunk, not per document
-- Enables semantic search over 200-800 token chunks
-- Embedding dimension: 1536 (OpenAI text-embedding-3-small). pgvector indexes support max 2000 dimensions.

CREATE TABLE IF NOT EXISTS rag_doc_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rag_doc_id UUID NOT NULL REFERENCES rag_docs(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT rag_doc_chunks_doc_index_unique UNIQUE (rag_doc_id, chunk_index)
);

-- Index for filtering by agent (required for RAG query)
CREATE INDEX IF NOT EXISTS idx_rag_doc_chunks_agent_id ON rag_doc_chunks(agent_id);

-- HNSW index for approximate nearest neighbor (max 2000 dimensions in pgvector; 1536 is supported)
CREATE INDEX IF NOT EXISTS idx_rag_doc_chunks_embedding_hnsw
  ON rag_doc_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE rag_doc_chunks IS 'Chunk-level embeddings for RAG; query by agent_id and vector similarity.';

-- RPC for similarity search (cosine distance). Call from API with query embedding.
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(1536),
  filter_agent_id TEXT,
  match_count INTEGER DEFAULT 5,
  match_threshold DOUBLE PRECISION DEFAULT 0.0
)
RETURNS TABLE (
  id UUID,
  rag_doc_id UUID,
  agent_id TEXT,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.rag_doc_id,
    c.agent_id,
    c.chunk_index,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM rag_doc_chunks c
  WHERE c.agent_id = filter_agent_id
    AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
