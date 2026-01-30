import { NextRequest, NextResponse } from 'next/server';
import { getSessionByVapiCallId } from '@/lib/db';

/**
 * GET /api/sessions/by-vapi-call/[callId]
 * Returns session transcript and summary for a Vapi call (used after call end to fetch clean transcript).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    if (!callId) {
      return NextResponse.json({ error: 'callId required' }, { status: 400 });
    }
    const detail = await getSessionByVapiCallId(callId);
    if (!detail) {
      return NextResponse.json({ transcript: [], summary: null, sessionId: null }, { status: 200 });
    }
    return NextResponse.json({
      sessionId: detail.session.id,
      transcript: detail.transcript,
      summary: detail.summary?.summary_text ?? null,
    });
  } catch (e) {
    console.error('Error fetching session by vapi call:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
