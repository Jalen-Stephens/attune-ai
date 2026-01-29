import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { SEED_AGENTS } from '@/lib/agents';

function requireIngestSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Seed not configured: INGEST_SECRET is not set' },
      { status: 503 }
    );
  }
  const header =
    request.headers.get('x-ingest-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (header !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * One-time seed: insert all SEED_AGENTS into agent_profiles.
 * Uses upsert so it's safe to run multiple times.
 * Protects with INGEST_SECRET (same as RAG ingest).
 */
export async function POST(request: NextRequest) {
  const authError = requireIngestSecret(request);
  if (authError) return authError;

  try {
    const supabase = createServiceRoleClient();
    const rows = SEED_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      system_prompt: a.system_prompt,
      rag_namespace: a.rag_namespace,
      intake_questions: a.intake_questions ?? null,
    }));

    const { error } = await supabase
      .from('agent_profiles')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to seed agent_profiles: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      inserted: rows.length,
    });
  } catch (error) {
    console.error('Error seeding agent_profiles:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to seed agents',
      },
      { status: 500 }
    );
  }
}
