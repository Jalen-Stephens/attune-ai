-- Enable pgvector for semantic search
-- Compatible with OpenAI text-embedding-3-large (3072 dimensions)
-- Run in Supabase SQL Editor or via: supabase db push

CREATE EXTENSION IF NOT EXISTS vector;

-- Optional: store embedding dimension in a comment for documentation
COMMENT ON EXTENSION vector IS 'pgvector for embeddings; use vector(3072) for OpenAI text-embedding-3-large';
