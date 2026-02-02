import { NextRequest, NextResponse } from 'next/server';
import { getSessionTimeline } from '@/lib/db';

/**
 * GET /api/sessions/[sessionId]/timeline
 * Returns unified timeline (transcript turns + tool events) for display in chat.
 * Query param voiceSessionId: optional - merge tool events from voice session too (tools may log to either).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    const voiceSessionId = request.nextUrl.searchParams.get('voiceSessionId');
    const timeline = await getSessionTimeline(sessionId, voiceSessionId || undefined);
    return NextResponse.json({ timeline });
  } catch (e) {
    console.error('Error fetching session timeline:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
