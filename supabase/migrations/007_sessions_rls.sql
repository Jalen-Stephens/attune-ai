-- RLS for sessions: users can manage their own sessions; anonymous (e.g. webhook) can create with user_id NULL

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own or anonymous session" ON public.sessions;
DROP POLICY IF EXISTS "Users can read own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;

-- Authenticated users can insert a session for themselves; unauthenticated (e.g. webhook) can insert with user_id NULL
CREATE POLICY "Users can insert own or anonymous session"
  ON public.sessions FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Users can only read their own sessions
CREATE POLICY "Users can read own sessions"
  ON public.sessions FOR SELECT
  USING (user_id = auth.uid());

-- Users can only update their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
