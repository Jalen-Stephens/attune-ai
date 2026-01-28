// Core data model types

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  rag_namespace: string;
  intake_questions?: string[];
  created_at?: string;
}

export interface Session {
  id: string;
  agent_id: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at?: string | null;
  created_at?: string;
  agent?: AgentProfile;
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
