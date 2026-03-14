-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent Profiles Table
CREATE TABLE IF NOT EXISTS agent_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  rag_namespace TEXT NOT NULL,
  intake_questions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcript Turns Table
CREATE TABLE IF NOT EXISTS transcript_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  text TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Summaries Table
CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  summary_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG Documents Table
-- Note: embedding column is a placeholder for pgvector extension
-- Will be updated to vector type when pgvector is enabled
CREATE TABLE IF NOT EXISTS rag_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BYTEA, -- Placeholder: will be vector type when pgvector is enabled
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations Table (extends sessions with user contact info)
-- Note: We'll use sessions table as conversations, but add user contact fields
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS channel TEXT CHECK (channel IN ('voice', 'chat', 'unknown')) DEFAULT 'unknown';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vapi_call_id TEXT UNIQUE; -- For idempotency
CREATE INDEX IF NOT EXISTS idx_sessions_vapi_call_id ON sessions(vapi_call_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);

-- Intakes Table
CREATE TABLE IF NOT EXISTS intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reason_for_visit TEXT,
  symptoms TEXT,
  duration TEXT,
  urgency_flags JSONB, -- Array of flags like ['severe_pain', 'emergency']
  location_zip TEXT,
  location_city TEXT,
  location_state TEXT,
  insurance_provider TEXT,
  insurance_plan TEXT,
  appointment_preference TEXT CHECK (appointment_preference IN ('in-person', 'telehealth', 'either')) DEFAULT 'either',
  user_email TEXT NOT NULL,
  consent_to_use_info BOOLEAN DEFAULT false,
  consent_to_email BOOLEAN DEFAULT false,
  recommended_specialty TEXT, -- e.g., 'dermatologist', 'cardiologist'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id) -- One intake per session
);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL, -- Google Place ID or legacy provider ID
  provider_name TEXT NOT NULL,
  provider_credentials TEXT,
  specialty TEXT NOT NULL,
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  distance_miles DECIMAL(10, 2),
  next_available_date TIMESTAMP WITH TIME ZONE,
  booking_url TEXT NOT NULL,
  zocdoc_url TEXT, -- Legacy; nullable after Google Places migration
  place_id TEXT, -- Google Place ID when from Places API
  accepted_insurance JSONB, -- Array of insurance names
  rating DECIMAL(3, 2),
  review_count INTEGER,
  score DECIMAL(10, 4) NOT NULL, -- Our computed score
  rank INTEGER NOT NULL, -- 1 = best match, 2 = second best, etc.
  match_reasons JSONB, -- Array of reasons like ['closest', 'soonest_availability']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events / Audit Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'intake_completed', 'referrals_returned', 'referral_clicked', 'email_sent', 'email_failed', 'provider_search_error'
  payload_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Summaries Table
CREATE TABLE IF NOT EXISTS email_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  provider_options_json JSONB NOT NULL, -- Array of referral objects
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  idempotency_key TEXT UNIQUE NOT NULL, -- conversation_id-based
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_turns_session_id ON transcript_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_turns_timestamp ON transcript_turns(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_summaries_session_id ON session_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_agent_id ON rag_docs(agent_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_created_at ON rag_docs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intakes_session_id ON intakes(session_id);
CREATE INDEX IF NOT EXISTS idx_intakes_user_email ON intakes(user_email);
CREATE INDEX IF NOT EXISTS idx_referrals_session_id ON referrals(session_id);
CREATE INDEX IF NOT EXISTS idx_referrals_rank ON referrals(session_id, rank);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_summaries_session_id ON email_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_status ON email_summaries(status);
CREATE INDEX IF NOT EXISTS idx_email_summaries_idempotency_key ON email_summaries(idempotency_key);
