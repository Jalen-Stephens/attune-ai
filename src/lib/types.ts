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
    title: string;
    content: string;
    metadata?: Record<string, any>;
    score?: number;
  }>;
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
  zocdoc_url: string;
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

// Zocdoc Types
export interface ZocdocProvider {
  id: string;
  name: string;
  credentials?: string;
  specialties: string[];
  addresses: Array<{
    address: string;
    city: string;
    state: string;
    zip: string;
    distance?: number;
  }>;
  next_available?: string;
  booking_url: string;
  accepted_insurance?: string[];
  rating?: number;
  review_count?: number;
}

export interface ProviderSearchParams {
  specialty?: string;
  condition?: string;
  zip?: string;
  city?: string;
  state?: string;
  radius?: number; // in miles
  insurance?: string;
  appointment_type?: 'in-person' | 'telehealth' | 'either';
  availability_window?: {
    start: string; // ISO date
    end: string; // ISO date
  };
}

export interface ScoredProvider extends ZocdocProvider {
  score: number;
  match_reasons: string[];
  rank?: number; // Added when returned from searchAndScoreProviders
}
