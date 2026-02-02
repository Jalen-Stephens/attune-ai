-- Session resources: providers and RAG resources delivered during voice calls
-- Persisted when findProviders or getRagResources tools are called with sessionId

CREATE TABLE IF NOT EXISTS session_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('provider', 'resource')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- payload for kind='provider': { "providers": [...], "disclaimer"?: string }
-- payload for kind='resource': { "resources": [...] }

CREATE INDEX IF NOT EXISTS idx_session_resources_session_id ON session_resources(session_id);
CREATE INDEX IF NOT EXISTS idx_session_resources_created_at ON session_resources(created_at);
CREATE INDEX IF NOT EXISTS idx_session_resources_kind ON session_resources(kind);

COMMENT ON TABLE session_resources IS 'Providers and RAG resources delivered to user during voice call (findProviders, getRagResources).';

-- ---------------------------------------------------------------------------
-- session_resources: session-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own session_resources" ON public.session_resources;
CREATE POLICY "Users can read own session_resources"
  ON public.session_resources FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert session_resources" ON public.session_resources;
CREATE POLICY "Users or webhook can insert session_resources"
  ON public.session_resources FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );
