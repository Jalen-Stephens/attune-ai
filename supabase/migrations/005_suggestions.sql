-- UI suggestions: resources and agent switches offered to the user
-- Tracks whether suggestion was shown and clicked for analytics

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_id UUID NOT NULL REFERENCES transcript_turns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('resource', 'agent')),
  payload JSONB NOT NULL DEFAULT '{}',
  shown BOOLEAN NOT NULL DEFAULT false,
  clicked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- payload for kind='resource': { "id", "title", "snippet", "url", "type", "reason" }
-- payload for kind='agent': { "agent_id", "name", "reason", "confidence" }

CREATE INDEX IF NOT EXISTS idx_suggestions_session_id ON suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_turn_id ON suggestions(turn_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_kind ON suggestions(kind);

COMMENT ON TABLE suggestions IS 'Resource and agent suggestions attached to assistant turns; track show/click for analytics.';
