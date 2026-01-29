-- Retrieval observability: log which context influenced each assistant response
-- Used for debugging, auditing, and improving RAG quality

CREATE TABLE IF NOT EXISTS rag_retrievals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  assistant_turn_id UUID NOT NULL REFERENCES transcript_turns(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  retrieved_chunks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- retrieved_chunks schema: [{ "chunk_id": "uuid", "rag_doc_id": "uuid", "score": 0.92, "content_preview": "..." }, ...]

CREATE INDEX IF NOT EXISTS idx_rag_retrievals_session_id ON rag_retrievals(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_retrievals_assistant_turn_id ON rag_retrievals(assistant_turn_id);
CREATE INDEX IF NOT EXISTS idx_rag_retrievals_created_at ON rag_retrievals(created_at DESC);

COMMENT ON TABLE rag_retrievals IS 'Log of RAG retrievals per assistant turn for observability and debugging.';
