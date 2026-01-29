-- Session state (topic, risk, routing) and optional user linkage
-- state is updated during chat for routing and safety

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS state JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- state schema:
-- {
--   "current_topic": "string",
--   "risk_flags": ["crisis_mentioned", "high_distress"],
--   "active_agent": "agent_id",
--   "last_router_confidence": 0.85
-- }

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_state_gin ON sessions USING gin(state);

COMMENT ON COLUMN sessions.state IS 'Runtime state: current_topic, risk_flags, active_agent, last_router_confidence.';
