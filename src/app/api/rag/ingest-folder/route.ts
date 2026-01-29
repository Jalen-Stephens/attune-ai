import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ingestFolder } from '@/lib/rag/ingest-folder';

const IngestFolderSchema = z.object({
  overrideAgentId: z.string().min(1).optional(),
});

function requireIngestSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Ingest not configured: INGEST_SECRET is not set' },
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

export async function POST(request: NextRequest) {
  const authError = requireIngestSecret(request);
  if (authError) return authError;

  try {
    let overrideAgentId: string | undefined;
    try {
      const body = await request.json();
      const parsed = IngestFolderSchema.safeParse(body);
      if (parsed.success && parsed.data.overrideAgentId) {
        overrideAgentId = parsed.data.overrideAgentId;
      }
    } catch {
      // No body or invalid JSON: proceed without override
    }

    const result = await ingestFolder(overrideAgentId);

    return NextResponse.json({
      filesProcessed: result.filesProcessed,
      docsInserted: result.docsInserted,
      totalChunksInserted: result.totalChunksInserted,
      failures: result.failures,
    });
  } catch (error) {
    console.error('Error ingesting RAG folder:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to ingest folder',
      },
      { status: 500 }
    );
  }
}
