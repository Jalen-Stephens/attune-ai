import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { getSessionDetail } from '@/lib/db';
import { getAgentById } from '@/lib/agents';

const UpdateSessionSchema = z.object({
  agentId: z.string().min(1),
});

/**
 * PATCH /api/sessions/[sessionId]
 * Update the session's agent (e.g. when user selects a suggested agent for voice).
 * Validates ownership via getSessionDetail (RLS).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { agentId } = UpdateSessionSchema.parse(body);

    await getSessionDetail(sessionId);

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('sessions')
      .update({ agent_id: agentId })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return NextResponse.json({ ok: true, agentId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: e.errors }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes('Failed to get session')) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('PATCH session error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    );
  }
}
