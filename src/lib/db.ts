import { createServerClient } from './supabase/server';
import type { Session, TranscriptTurn, SessionSummary, AgentProfile } from './types';

const supabase = createServerClient();

/**
 * Create a new session for an agent
 */
export async function createSession(agentId: string): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      agent_id: agentId,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data.id;
}

/**
 * Insert a transcript turn into the database
 */
export async function insertTranscriptTurn(
  sessionId: string,
  role: 'user' | 'assistant',
  text: string,
  timestamp?: string
): Promise<void> {
  const { error } = await supabase
    .from('transcript_turns')
    .insert({
      session_id: sessionId,
      role,
      text,
      timestamp: timestamp || new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to insert transcript turn: ${error.message}`);
  }
}

/**
 * Mark a session as ended
 */
export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to end session: ${error.message}`);
  }
}

/**
 * Save a session summary
 */
export async function saveSummary(
  sessionId: string,
  summaryText: string,
  summaryJson?: SessionSummary['summary_json']
): Promise<void> {
  const { error } = await supabase
    .from('session_summaries')
    .upsert({
      session_id: sessionId,
      summary_text: summaryText,
      summary_json: summaryJson || null,
    }, {
      onConflict: 'session_id',
    });

  if (error) {
    throw new Error(`Failed to save summary: ${error.message}`);
  }
}

/**
 * List all sessions with agent information
 */
export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      agent_profiles (
        id,
        name,
        description
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  return data.map((session: any) => ({
    ...session,
    agent: session.agent_profiles ? {
      id: session.agent_profiles.id,
      name: session.agent_profiles.name,
      description: session.agent_profiles.description,
    } : undefined,
  }));
}

/**
 * Get session detail with transcript turns and summary
 */
export async function getSessionDetail(sessionId: string): Promise<{
  session: Session;
  transcript: TranscriptTurn[];
  summary: SessionSummary | null;
}> {
  // Get session with agent info
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      agent_profiles (
        id,
        name,
        description,
        system_prompt,
        rag_namespace
      )
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    throw new Error(`Failed to get session: ${sessionError.message}`);
  }

  // Get transcript turns
  const { data: transcriptData, error: transcriptError } = await supabase
    .from('transcript_turns')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (transcriptError) {
    throw new Error(`Failed to get transcript: ${transcriptError.message}`);
  }

  // Get summary
  const { data: summaryData, error: summaryError } = await supabase
    .from('session_summaries')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (summaryError && summaryError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is acceptable
    throw new Error(`Failed to get summary: ${summaryError.message}`);
  }

  return {
    session: {
      ...sessionData,
      agent: sessionData.agent_profiles ? {
        id: sessionData.agent_profiles.id,
        name: sessionData.agent_profiles.name,
        description: sessionData.agent_profiles.description,
        system_prompt: sessionData.agent_profiles.system_prompt,
        rag_namespace: sessionData.agent_profiles.rag_namespace,
      } : undefined,
    },
    transcript: transcriptData || [],
    summary: summaryData || null,
  };
}
