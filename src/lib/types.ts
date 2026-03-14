// Core data model types

/** User profile (public.profiles), keyed by auth.users.id */
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Specialty category for directory/filtering */
export type AgentSpecialtyCategory =
  | 'Anxiety & Panic'
  | 'Depression & Mood'
  | 'ADHD & Executive Functioning'
  | 'Trauma & PTSD'
  | 'OCD'
  | 'Sleep & Insomnia'
  | 'Stress & Burnout'
  | 'Anger & Emotional Regulation'
  | 'Grief & Loss'
  | 'Relationships & Couples'
  | 'Family & Parenting'
  | 'Addiction & Recovery'
  | 'Eating & Body Image'
  | 'Social Anxiety & Confidence'
  | 'Work & Career'
  | "Men's Mental Health"
  | "Women's Mental Health"
  | 'LGBTQ+ Affirming'
  | 'Chronic Illness Coping'
  | 'Mindfulness & Meditation'
  | 'General Reflection'
  | 'Motivation & Habits'
  | 'Communication'
  | 'Boundaries & Assertiveness'
  | 'Self-Esteem & Self-Compassion';

/** Optional intensity / style for filtering */
export type AgentIntensity = 'gentle' | 'structured' | 'direct';

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  rag_namespace: string;
  intake_questions?: string[];
  created_at?: string;
  /** Directory UX: primary specialty category */
  specialtyCategory?: AgentSpecialtyCategory;
  /** Tags for filter chips (e.g. CBT, Anxiety, Couples) */
  tags?: string[];
  /** Short "good for" bullets for detail page */
  recommendedFor?: string[];
  /** Short disclaimer (e.g. not for emergencies) */
  disclaimer?: string;
  /** Optional style/intensity */
  intensity?: AgentIntensity;
  /** Optional emoji or initials for list avatar */
  icon?: string;
}

export interface Session {
  id: string;
  agent_id: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at?: string | null;
  created_at?: string;
  agent?: AgentProfile;
  user_email?: string | null;
  user_phone?: string | null;
  channel?: 'voice' | 'chat' | 'unknown' | null;
  vapi_call_id?: string | null;
  state?: SessionState | null;
  user_id?: string | null;
}

export interface TranscriptTurn {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  created_at?: string;
}

export interface SessionSummary {
  id: string;
  session_id: string;
  summary_text: string;
  summary_json?: {
    topics?: string[];
    emotional_themes?: string[];
    patterns?: string[];
    tools_mentioned?: string[];
    action_items?: string[];
    follow_up_prompts?: string[];
  } | null;
  created_at?: string;
}

export interface RagDoc {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  embedding?: Uint8Array | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

/** Chunk-level RAG record with embedding (rag_doc_chunks) */
export interface RagDocChunk {
  id: string;
  rag_doc_id: string;
  agent_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[] | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

/** Observability: one row per RAG retrieval for an assistant turn */
export interface RagRetrieval {
  id: string;
  session_id: string;
  assistant_turn_id: string;
  query: string;
  retrieved_chunks: RetrievedChunkLog[];
  created_at?: string;
}

export interface RetrievedChunkLog {
  chunk_id: string;
  rag_doc_id: string;
  score: number;
  content_preview?: string;
}

/** UI suggestion (resource or agent) attached to a turn */
export interface Suggestion {
  id: string;
  session_id: string;
  turn_id: string;
  kind: 'resource' | 'agent';
  payload: ResourceSuggestionPayload | AgentSuggestionPayload;
  shown: boolean;
  clicked: boolean;
  created_at?: string;
}

export interface ResourceSuggestionPayload {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  type: string;
  reason: string;
}

export interface AgentSuggestionPayload {
  agent_id: string;
  name: string;
  reason: string;
  confidence: number;
}

/** Session runtime state (sessions.state JSONB) */
export interface SessionState {
  current_topic?: string;
  risk_flags?: string[];
  active_agent?: string;
  last_router_confidence?: number;
}

// Vapi webhook event types
export interface VapiWebhookEvent {
  type: 'transcript' | 'call-ended' | 'call-started' | 'function-call' | 'status-update';
  call?: {
    id?: string;
    status?: string;
  };
  message?: {
    role?: 'user' | 'assistant';
    content?: string;
    timestamp?: string;
  };
  transcript?: {
    role?: 'user' | 'assistant';
    text?: string;
    timestamp?: string;
  };
  timestamp?: string;
  [key: string]: any; // Allow additional fields
}

// API request/response types
export interface StartSessionRequest {
  agentId: string;
}

export interface StartSessionResponse {
  sessionId: string;
  vapi: {
    callId?: string;
    webhookUrl?: string;
    agentPrompt?: string;
    [key: string]: any;
  };
}

export interface RagIngestRequest {
  agentId: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RagQueryRequest {
  agentId: string;
  query: string;
  topK?: number;
}

export interface RagQueryResponse {
  results: Array<{
    id: string;
    title?: string;
    content: string;
    metadata?: Record<string, unknown>;
    score?: number;
    chunk_id?: string;
    rag_doc_id?: string;
  }>;
}

/** Structured LLM chat response (message + resources + suggested agents) */
export interface ChatStructuredResponse {
  message: string;
  resources: Array<{
    id: string;
    title: string;
    snippet: string;
    url?: string;
    type: string;
    reason: string;
  }>;
  suggested_agents: Array<{
    agent_id: string;
    name: string;
    reason: string;
    confidence: number;
  }>;
}

/** Frontend chat API response contract */
export interface ChatApiResponse {
  turnId: string;
  message: string;
  resources: ResourceCard[];
  suggestedAgents: AgentCard[];
  retrievalLogged: boolean;
}

export interface ResourceCard {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  type: string;
  reason: string;
}

export interface AgentCard {
  agent_id: string;
  name: string;
  reason: string;
  confidence: number;
}

// Screening + Referral Types
export interface Intake {
  id: string;
  session_id: string;
  reason_for_visit?: string | null;
  symptoms?: string | null;
  duration?: string | null;
  urgency_flags?: string[] | null;
  location_zip?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  insurance_provider?: string | null;
  insurance_plan?: string | null;
  appointment_preference?: 'in-person' | 'telehealth' | 'either' | null;
  user_email: string;
  consent_to_use_info: boolean;
  consent_to_email: boolean;
  recommended_specialty?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Referral {
  id: string;
  session_id: string;
  provider_id: string;
  provider_name: string;
  provider_credentials?: string | null;
  specialty: string;
  location_address?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_zip?: string | null;
  distance_miles?: number | null;
  next_available_date?: string | null;
  booking_url: string;
  /** @deprecated Legacy Zocdoc field; use booking_url. Now nullable after Google Places migration. */
  zocdoc_url?: string | null;
  /** Google Place ID when provider comes from Google Places API */
  place_id?: string | null;
  accepted_insurance?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  score: number;
  rank: number;
  match_reasons?: string[] | null;
  created_at?: string;
}

export interface Event {
  id: string;
  session_id: string;
  event_type: string;
  payload_json?: Record<string, any> | null;
  created_at?: string;
}

export interface EmailSummary {
  id: string;
  session_id: string;
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  provider_options_json: Referral[];
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  sent_at?: string | null;
  error_message?: string | null;
  retry_count: number;
  idempotency_key: string;
  created_at?: string;
  updated_at?: string;
}

// Provider search (Google Places) — used when mapping PlaceProvider to Referral
export interface ProviderSearchResult {
  place_id: string;
  name: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  distanceMiles?: number;
  matchReasons: string[];
}
