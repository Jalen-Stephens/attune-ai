-- RLS policies for all app tables (sessions already in 007).
-- Session-scoped access: allow when session belongs to user (user_id = auth.uid())
-- or when session is anonymous (user_id IS NULL) for INSERT so webhook can write.

-- ---------------------------------------------------------------------------
-- agent_profiles: reference data, readable by all (needed for session join and agent list)
-- ---------------------------------------------------------------------------
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read agent_profiles" ON public.agent_profiles;
CREATE POLICY "Anyone can read agent_profiles"
  ON public.agent_profiles FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- transcript_turns: session-scoped; user sees own; user or webhook can insert
-- ---------------------------------------------------------------------------
ALTER TABLE public.transcript_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transcript_turns" ON public.transcript_turns;
CREATE POLICY "Users can read own transcript_turns"
  ON public.transcript_turns FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert transcript_turns" ON public.transcript_turns;
CREATE POLICY "Users or webhook can insert transcript_turns"
  ON public.transcript_turns FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- session_summaries: session-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own session_summaries" ON public.session_summaries;
CREATE POLICY "Users can read own session_summaries"
  ON public.session_summaries FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert session_summaries" ON public.session_summaries;
CREATE POLICY "Users or webhook can insert session_summaries"
  ON public.session_summaries FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own session_summaries" ON public.session_summaries;
CREATE POLICY "Users can update own session_summaries"
  ON public.session_summaries FOR UPDATE
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- rag_docs / rag_doc_chunks: readable by authenticated (RAG query); ingest uses service role
-- ---------------------------------------------------------------------------
ALTER TABLE public.rag_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read rag_docs" ON public.rag_docs;
CREATE POLICY "Authenticated can read rag_docs"
  ON public.rag_docs FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE public.rag_doc_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read rag_doc_chunks" ON public.rag_doc_chunks;
CREATE POLICY "Authenticated can read rag_doc_chunks"
  ON public.rag_doc_chunks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- rag_retrievals: session-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.rag_retrievals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own rag_retrievals" ON public.rag_retrievals;
CREATE POLICY "Users can read own rag_retrievals"
  ON public.rag_retrievals FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert rag_retrievals" ON public.rag_retrievals;
CREATE POLICY "Users or webhook can insert rag_retrievals"
  ON public.rag_retrievals FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- suggestions: session-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own suggestions" ON public.suggestions;
CREATE POLICY "Users can read own suggestions"
  ON public.suggestions FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert suggestions" ON public.suggestions;
CREATE POLICY "Users or webhook can insert suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- intakes: session-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own intakes" ON public.intakes;
CREATE POLICY "Users can read own intakes"
  ON public.intakes FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert intakes" ON public.intakes;
CREATE POLICY "Users or webhook can insert intakes"
  ON public.intakes FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own intakes" ON public.intakes;
CREATE POLICY "Users can update own intakes"
  ON public.intakes FOR UPDATE
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- referrals: session-scoped (read only from app)
-- ---------------------------------------------------------------------------
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert referrals" ON public.referrals;
CREATE POLICY "Users or webhook can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- events: session-scoped (audit log)
-- ---------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own events" ON public.events;
CREATE POLICY "Users can read own events"
  ON public.events FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert events" ON public.events;
CREATE POLICY "Users or webhook can insert events"
  ON public.events FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- email_summaries: session-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own email_summaries" ON public.email_summaries;
CREATE POLICY "Users can read own email_summaries"
  ON public.email_summaries FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users or webhook can insert email_summaries" ON public.email_summaries;
CREATE POLICY "Users or webhook can insert email_summaries"
  ON public.email_summaries FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own email_summaries" ON public.email_summaries;
CREATE POLICY "Users can update own email_summaries"
  ON public.email_summaries FOR UPDATE
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));
