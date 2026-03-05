import { createServerClient, createServiceRoleClient } from '@/utils/supabase/server';
import type { Session, TranscriptTurn, SessionSummary, AgentProfile, Intake, Referral, Event, EmailSummary, UserProfile, Suggestion } from './types';

/**
 * Create a new session for an agent.
 * Sets user_id when the caller is authenticated so RLS allows the insert.
 */
export async function createSession(agentId: string): Promise<string> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      agent_id: agentId,
      status: 'active',
      ...(user?.id && { user_id: user.id }),
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
  const supabase = await createServerClient();
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
  const supabase = await createServerClient();
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
 * Mark a session as ended (service role). Use from webhook when no user context.
 */
export async function endSessionServiceRole(sessionId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (error) throw new Error(`Failed to end session: ${error.message}`);
}

/**
 * Save a session summary
 */
export async function saveSummary(
  sessionId: string,
  summaryText: string,
  summaryJson?: SessionSummary['summary_json']
): Promise<void> {
  const supabase = await createServerClient();
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
 * Save a session summary (service role). Use from webhook when no user context.
 */
export async function saveSummaryServiceRole(
  sessionId: string,
  summaryText: string,
  summaryJson?: SessionSummary['summary_json']
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('session_summaries')
    .upsert(
      {
        session_id: sessionId,
        summary_text: summaryText,
        summary_json: summaryJson ?? null,
      },
      { onConflict: 'session_id' }
    );
  if (error) throw new Error(`Failed to save summary: ${error.message}`);
}

/**
 * Replace all transcript turns for a session (e.g. with clean end-of-call artifact).
 * Uses service role to bypass RLS for delete.
 */
export async function replaceTranscriptTurns(
  sessionId: string,
  turns: { role: 'user' | 'assistant'; text: string; timestamp?: string }[]
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error: delError } = await supabase
    .from('transcript_turns')
    .delete()
    .eq('session_id', sessionId);
  if (delError) {
    throw new Error(`Failed to delete transcript turns: ${delError.message}`);
  }
  for (const t of turns) {
    const { error } = await supabase.from('transcript_turns').insert({
      session_id: sessionId,
      role: t.role,
      text: t.text,
      timestamp: t.timestamp || new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to insert transcript turn: ${error.message}`);
  }
}

/**
 * Append transcript turns to a session (e.g. voice turns into dashboard session).
 * Uses service role.
 */
export async function appendTranscriptTurns(
  sessionId: string,
  turns: { role: 'user' | 'assistant'; text: string; timestamp?: string }[]
): Promise<void> {
  if (turns.length === 0) return;
  const supabase = createServiceRoleClient();
  for (const t of turns) {
    const { error } = await supabase.from('transcript_turns').insert({
      session_id: sessionId,
      role: t.role,
      text: t.text,
      timestamp: t.timestamp || new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to append transcript turn: ${error.message}`);
  }
}

/**
 * Get session with transcript and summary by Vapi call ID. Uses service role.
 */
export async function getSessionByVapiCallId(vapiCallId: string): Promise<{
  session: Session;
  transcript: TranscriptTurn[];
  summary: SessionSummary | null;
} | null> {
  const supabase = createServiceRoleClient();
  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('vapi_call_id', vapiCallId)
    .single();
  if (sessionError || !sessionRow) return null;

  const { data: transcriptData } = await supabase
    .from('transcript_turns')
    .select('*')
    .eq('session_id', sessionRow.id)
    .order('timestamp', { ascending: true });

  const { data: summaryRow } = await supabase
    .from('session_summaries')
    .select('*')
    .eq('session_id', sessionRow.id)
    .single();

  return {
    session: sessionRow as Session,
    transcript: (transcriptData ?? []) as TranscriptTurn[],
    summary: (summaryRow as SessionSummary) ?? null,
  };
}

/**
 * List all sessions with agent information
 */
export async function listSessions(): Promise<Session[]> {
  const supabase = await createServerClient();
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
  userDisplayName: string | null;
}> {
  const supabase = await createServerClient();
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

  // Resolve user display name from profile when session has user_id
  let userDisplayName: string | null = null;
  if (sessionData.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', sessionData.user_id)
      .single();
    if (profile) {
      userDisplayName = profile.display_name?.trim() || profile.full_name?.trim() || null;
    }
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
    userDisplayName,
  };
}

/**
 * Get all suggestions for a session (grouped by turn for transcript UI)
 */
export async function getSuggestionsForSession(sessionId: string): Promise<Suggestion[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, turn_id, kind, payload')
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to get suggestions: ${error.message}`);
  }
  return (data || []).map((row) => ({
    id: row.id,
    session_id: sessionId,
    turn_id: row.turn_id,
    kind: row.kind as 'resource' | 'agent',
    payload: row.payload as Suggestion['payload'],
    shown: false,
    clicked: false,
  }));
}

/**
 * Create or update session with Vapi call ID (for idempotency)
 */
export async function createOrUpdateSession(
  agentId: string,
  vapiCallId: string,
  userEmail?: string,
  userPhone?: string,
  channel: 'voice' | 'chat' | 'unknown' = 'voice'
): Promise<string> {
  const supabase = await createServerClient();
  
  // Check if session with this Vapi call ID already exists
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('vapi_call_id', vapiCallId)
    .single();
  
  if (existing) {
    return existing.id;
  }
  
  // Create new session (user_id explicitly null for webhook/anon so RLS allows insert)
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      agent_id: agentId,
      status: 'active',
      vapi_call_id: vapiCallId,
      user_id: null,
      user_email: userEmail || null,
      user_phone: userPhone || null,
      channel,
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
  
  return data.id;
}

/**
 * Create or update session (service role). Use from webhook—bypasses RLS.
 */
export async function createOrUpdateSessionServiceRole(
  agentId: string,
  vapiCallId: string,
  userEmail?: string,
  userPhone?: string,
  channel: 'voice' | 'chat' | 'unknown' = 'voice'
): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('vapi_call_id', vapiCallId)
    .single();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      agent_id: agentId,
      status: 'active',
      vapi_call_id: vapiCallId,
      user_id: null,
      user_email: userEmail || null,
      user_phone: userPhone || null,
      channel,
    })
    .select('id')
    .single();

  if (error) {
    const isDuplicate =
      error.code === '23505' ||
      (typeof error.message === 'string' && error.message.includes('duplicate key'));
    if (isDuplicate) {
      const { data: retry } = await supabase
        .from('sessions')
        .select('id')
        .eq('vapi_call_id', vapiCallId)
        .single();
      if (retry?.id) return retry.id;
    }
    throw new Error(`Failed to create session: ${error.message}`);
  }
  return data.id;
}

/**
 * Update an existing session with Vapi call ID (service role).
 * Used by the webhook when the client passed sessionId at call start so we attach the call to that session.
 */
export async function updateSessionVapiCallId(
  sessionId: string,
  vapiCallId: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('sessions')
    .update({ vapi_call_id: vapiCallId })
    .eq('id', sessionId);
  if (error) throw new Error(`Failed to update session vapi_call_id: ${error.message}`);
}

/**
 * Get session by ID (service role). Use from webhook when no user context.
 * Returns null if not found.
 */
export async function getSessionByIdServiceRole(sessionId: string): Promise<Session | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (error || !data) return null;
  return data as Session;
}

/**
 * Create or update intake
 */
export async function createOrUpdateIntake(
  sessionId: string,
  intakeData: Partial<Intake> & { user_email: string }
): Promise<Intake> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('intakes')
    .upsert({
      session_id: sessionId,
      ...intakeData,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'session_id',
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create/update intake: ${error.message}`);
  }
  
  return data;
}

/**
 * Get intake by session ID
 */
export async function getIntake(sessionId: string): Promise<Intake | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('intakes')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get intake: ${error.message}`);
  }
  
  return data;
}

/**
 * Save referrals for a session
 */
export async function saveReferrals(
  sessionId: string,
  referrals: Omit<Referral, 'id' | 'created_at'>[]
): Promise<Referral[]> {
  const supabase = await createServerClient();
  
  // Delete existing referrals for this session
  await supabase
    .from('referrals')
    .delete()
    .eq('session_id', sessionId);
  
  // Insert new referrals
  const { data, error } = await supabase
    .from('referrals')
    .insert(referrals.map(ref => ({
      ...ref,
      session_id: sessionId,
    })))
    .select();
  
  if (error) {
    throw new Error(`Failed to save referrals: ${error.message}`);
  }
  
  return data;
}

/**
 * Get referrals for a session
 */
export async function getReferrals(sessionId: string): Promise<Referral[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('session_id', sessionId)
    .order('rank', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to get referrals: ${error.message}`);
  }
  
  return data || [];
}

/** Session resource (providers or RAG resources) delivered during voice call */
export interface SessionResource {
  id: string;
  session_id: string;
  kind: 'provider' | 'resource';
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Insert a session resource (provider list or RAG resources). Uses service role for tool routes.
 */
export async function insertSessionResource(
  sessionId: string,
  kind: 'provider' | 'resource',
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('session_resources').insert({
    session_id: sessionId,
    kind,
    payload,
  });
  if (error) throw new Error(`Failed to insert session resource: ${error.message}`);
}

/**
 * Copy tool events (tool_findProviders, tool_getRagResources) from one session to another.
 * Uses service role. Used when linking voice call to dashboard session.
 */
export async function copyToolEvents(
  fromSessionId: string,
  toSessionId: string
): Promise<void> {
  if (fromSessionId === toSessionId) return;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('events')
    .select('event_type, payload_json, created_at')
    .eq('session_id', fromSessionId)
    .in('event_type', ['tool_findProviders', 'tool_getRagResources'])
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to fetch tool events: ${error.message}`);
  if (!data?.length) return;
  for (const row of data) {
    const { error: insErr } = await supabase.from('events').insert({
      session_id: toSessionId,
      event_type: row.event_type,
      payload_json: row.payload_json,
      created_at: row.created_at ?? new Date().toISOString(),
    });
    if (insErr) throw new Error(`Failed to copy tool event: ${insErr.message}`);
  }
}

/**
 * Copy session_resources from one session to another. Uses service role.
 * Used when linking voice call to dashboard session.
 */
export async function copySessionResources(
  fromSessionId: string,
  toSessionId: string
): Promise<void> {
  if (fromSessionId === toSessionId) return;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('session_resources')
    .select('kind, payload')
    .eq('session_id', fromSessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to fetch session resources: ${error.message}`);
  if (!data?.length) return;
  for (const row of data) {
    const { error: insErr } = await supabase.from('session_resources').insert({
      session_id: toSessionId,
      kind: row.kind,
      payload: row.payload,
    });
    if (insErr) throw new Error(`Failed to copy session resource: ${insErr.message}`);
  }
}

/**
 * Get all session resources (providers and RAG resources) for a session, ordered by created_at.
 */
export async function getSessionResources(sessionId: string): Promise<SessionResource[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('session_resources')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to get session resources: ${error.message}`);
  return (data ?? []) as SessionResource[];
}

/** Timeline item: transcript turn or tool event */
export type SessionTimelineItem =
  | { type: 'transcript'; turn: TranscriptTurn }
  | { type: 'tool'; tool: 'findProviders' | 'getRagResources'; timestamp: string; payload: Record<string, unknown> };

/**
 * Get unified session timeline: transcript turns + tool events (findProviders, getRagResources)
 * merged in chronological order for display.
 * If voiceSessionId is provided, also fetches tool events from that session (tools may log to either).
 * Uses service role for voice session events (voice sessions have user_id=null, RLS would block).
 */
export async function getSessionTimeline(
  sessionId: string,
  voiceSessionId?: string
): Promise<SessionTimelineItem[]> {
  const supabase = await createServerClient();
  const supabaseAdmin = createServiceRoleClient();

  const [transcriptRes, dashboardEventsRes, voiceEventsRes] = await Promise.all([
    supabase
      .from('transcript_turns')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true }),
    supabase
      .from('events')
      .select('id, event_type, payload_json, created_at')
      .eq('session_id', sessionId)
      .in('event_type', ['tool_findProviders', 'tool_getRagResources'])
      .order('created_at', { ascending: true }),
    voiceSessionId && voiceSessionId !== sessionId
      ? supabaseAdmin
          .from('events')
          .select('id, event_type, payload_json, created_at')
          .eq('session_id', voiceSessionId)
          .in('event_type', ['tool_findProviders', 'tool_getRagResources'])
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (transcriptRes.error) throw new Error(`Failed to get transcript: ${transcriptRes.error.message}`);

  const allEventRows: { event_type: string; payload_json: unknown; created_at: string }[] = [
    ...((dashboardEventsRes.data ?? []) as typeof allEventRows),
    ...((voiceEventsRes.data ?? []) as typeof allEventRows),
  ];
  allEventRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const transcriptItems: SessionTimelineItem[] = (transcriptRes.data ?? []).map((t) => ({
    type: 'transcript' as const,
    turn: t as TranscriptTurn,
  }));

  const toolItems: SessionTimelineItem[] = allEventRows.map((e) => {
    const tool = e.event_type === 'tool_findProviders' ? 'findProviders' : 'getRagResources';
    return {
      type: 'tool' as const,
      tool,
      timestamp: e.created_at ?? new Date().toISOString(),
      payload: (e.payload_json as Record<string, unknown>) ?? {},
    };
  });

  const all: SessionTimelineItem[] = [...transcriptItems, ...toolItems];
  all.sort((a, b) => {
    const tsA = a.type === 'transcript' ? a.turn.timestamp : a.timestamp;
    const tsB = b.type === 'transcript' ? b.turn.timestamp : b.timestamp;
    return new Date(tsA).getTime() - new Date(tsB).getTime();
  });
  return all;
}

/**
 * Log an event
 */
export async function logEvent(
  sessionId: string,
  eventType: string,
  payload?: Record<string, any>
): Promise<void> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('events')
    .insert({
      session_id: sessionId,
      event_type: eventType,
      payload_json: payload || null,
    });
  
  if (error) {
    console.error('Failed to log event:', error);
    // Don't throw - event logging should not break the flow
  }
}

/**
 * Create or get email summary (idempotent)
 */
export async function createOrGetEmailSummary(
  sessionId: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  providerOptions: Referral[]
): Promise<EmailSummary> {
  const supabase = await createServerClient();
  
  const idempotencyKey = `email_${sessionId}`;
  
  // Check if email summary already exists
  const { data: existing } = await supabase
    .from('email_summaries')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .single();
  
  if (existing) {
    return existing;
  }
  
  // Create new email summary
  const { data, error } = await supabase
    .from('email_summaries')
    .insert({
      session_id: sessionId,
      to_email: toEmail,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      provider_options_json: providerOptions,
      idempotency_key: idempotencyKey,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create email summary: ${error.message}`);
  }
  
  return data;
}

/**
 * Update email summary status
 */
export async function updateEmailSummaryStatus(
  idempotencyKey: string,
  status: 'sent' | 'failed' | 'retrying',
  errorMessage?: string
): Promise<void> {
  const supabase = await createServerClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }
  
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  
  if (status === 'retrying' || status === 'failed') {
    // Increment retry count
    const { data: existing } = await supabase
      .from('email_summaries')
      .select('retry_count')
      .eq('idempotency_key', idempotencyKey)
      .single();
    
    if (existing) {
      updateData.retry_count = (existing.retry_count || 0) + 1;
    }
  }
  
  const { error } = await supabase
    .from('email_summaries')
    .update(updateData)
    .eq('idempotency_key', idempotencyKey);
  
  if (error) {
    throw new Error(`Failed to update email summary: ${error.message}`);
  }
}

/**
 * Get email summary by idempotency key
 */
export async function getEmailSummary(idempotencyKey: string): Promise<EmailSummary | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('email_summaries')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get email summary: ${error.message}`);
  }
  
  return data;
}

// ——— User profiles (public.profiles) ———

/**
 * Get profile by user id. Returns null if not found.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get profile: ${error.message}`);
  }
  return data;
}

/**
 * Ensure a profile row exists for the user (upsert by id).
 * Use after signup or on first visit to settings.
 */
export async function upsertProfile(
  userId: string,
  email: string | null
): Promise<UserProfile> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
  return data;
}

/**
 * Update profile fields. Only updates provided fields.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'display_name' | 'avatar_url' | 'email'>>
): Promise<UserProfile> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data;
}
