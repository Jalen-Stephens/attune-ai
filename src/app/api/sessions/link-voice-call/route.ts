import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import {
  getSessionDetail,
  getSessionByVapiCallId,
  appendTranscriptTurns,
  saveSummaryServiceRole,
  endSessionServiceRole,
} from '@/lib/db';

const LinkVoiceCallSchema = z.object({
  sessionId: z.string().uuid(),
  vapiCallId: z.string().min(1),
});

/**
 * POST /api/sessions/link-voice-call
 * Merge voice session (transcript, summary, ended) into the dashboard session.
 * Call after a voice call ends so Session Details shows Vapi transcript, summary, and status ended.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, vapiCallId } = LinkVoiceCallSchema.parse(body);

    const supabase = await createServerClient();
    await supabase.auth.getUser(); // ensure auth context

    // Validate ownership: getSessionDetail uses RLS; throws if not user's session
    await getSessionDetail(sessionId);

    const voice = await getSessionByVapiCallId(vapiCallId);
    if (!voice || (!voice.transcript.length && !voice.summary?.summary_text)) {
      return NextResponse.json({ linked: false, reason: 'no_voice_data' }, { status: 200 });
    }

    const turns = voice.transcript.map((t) => ({
      role: t.role as 'user' | 'assistant',
      text: t.text,
      timestamp: t.timestamp,
    }));
    if (turns.length) {
      await appendTranscriptTurns(sessionId, turns);
    }
    if (voice.summary?.summary_text?.trim()) {
      await saveSummaryServiceRole(sessionId, voice.summary.summary_text.trim());
    }
    await endSessionServiceRole(sessionId);

    return NextResponse.json({ linked: true }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: e.errors }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes('Failed to get session')) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('Error linking voice call:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to link voice call' },
      { status: 500 }
    );
  }
}
