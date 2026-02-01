import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateVapiSecret } from '@/lib/tools/_auth';
import { logToolCall } from '@/lib/tools/_logger';
import { storeGetRagResources } from '@/lib/tools/_toolResultCache';
import { handleGetRagResources } from '@/lib/tools/getRagResources/handler';

const GetRagResourcesSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  topic: z.string().nullable().optional(),
  userMessage: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const start = Date.now();
  let sessionId: string | undefined;

  const authError = validateVapiSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = GetRagResourcesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    sessionId = parsed.data.sessionId;
    const result = await handleGetRagResources({
      sessionId: parsed.data.sessionId,
      topic: parsed.data.topic ?? null,
      userMessage: parsed.data.userMessage ?? null,
      agentId: parsed.data.agentId ?? null,
    });

    storeGetRagResources(parsed.data.sessionId, result.resources);

    if (process.env.NODE_ENV === 'development') {
      console.log('[getRagResources] stored', result.resources.length, 'resources for session', parsed.data.sessionId);
    }

    await logToolCall({
      toolName: 'getRagResources',
      sessionId,
      success: true,
      durationMs: Date.now() - start,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logToolCall({
      toolName: 'getRagResources',
      sessionId: sessionId ?? null,
      success: false,
      durationMs: Date.now() - start,
      errorMessage: message,
    });

    return NextResponse.json(
      { error: 'Failed to retrieve resources' },
      { status: 500 }
    );
  }
}
