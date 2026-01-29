import { createServerClient } from '@/utils/supabase/server';
import type { Session, TranscriptTurn, SessionSummary, AgentProfile, Intake, Referral, Event, EmailSummary, UserProfile } from './types';

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
  
  // Create new session
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      agent_id: agentId,
      status: 'active',
      vapi_call_id: vapiCallId,
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
