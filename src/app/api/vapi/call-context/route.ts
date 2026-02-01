import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { getSessionDetail, getProfile } from '@/lib/db';
import { summarizeTurnsWithLLM, summarizeTurnsHeuristic } from '@/lib/vapi/call-context-summary';
import type { CallContextResponse } from '@/lib/vapi/types';

const BodySchema = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Derive first and last name from profile. Profiles have full_name and display_name, not first_name/last_name.
 */
function deriveFirstLastName(profile: { full_name?: string | null; display_name?: string | null } | null): {
  firstName: string;
  lastName: string;
} {
  if (!profile) return { firstName: '', lastName: '' };
  const full = (profile.full_name ?? '').trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ') ?? '';
    return { firstName, lastName };
  }
  const display = (profile.display_name ?? '').trim();
  return { firstName: display, lastName: '' };
}

/**
 * POST /api/vapi/call-context
 * Returns user-aware context for Vapi call: first/last name, sessionId, and a short chat summary.
 * Auth: requires logged-in user; session must belong to the user (enforced by RLS).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = BodySchema.parse(body);

    const { session, transcript } = await getSessionDetail(sessionId);
    const profile = session.user_id ? await getProfile(session.user_id) : null;
    const { firstName, lastName } = deriveFirstLastName(profile);

    const turns = transcript.map((t) => ({ role: t.role as 'user' | 'assistant', text: t.text }));
    let chatSummary =
      (await summarizeTurnsWithLLM(turns)) ?? summarizeTurnsHeuristic(turns);

    if (!chatSummary.trim()) {
      chatSummary = 'The user just started the conversation.';
    }

    const response: CallContextResponse = {
      firstName: firstName || 'there',
      lastName: lastName || '',
      sessionId,
      chatSummary,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: e.flatten() },
        { status: 400 }
      );
    }
    if (e instanceof Error && e.message.includes('Failed to get session')) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('[call-context]', e);
    return NextResponse.json(
      { error: 'Failed to build call context' },
      { status: 500 }
    );
  }
}
