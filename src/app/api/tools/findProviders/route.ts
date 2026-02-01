import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateVapiSecret } from '@/lib/tools/_auth';
import { logToolCall } from '@/lib/tools/_logger';
import { storeFindProviders } from '@/lib/tools/_toolResultCache';
import { handleFindProviders } from '@/lib/tools/findProviders/handler';

const FindProvidersSchema = z.object({
  sessionId: z.string().optional(),
  zip: z.string().min(1, 'zip is required'),
  specialty: z.enum([
    'therapy',
    'psychiatry',
    'couples',
    'sleep',
    'anxiety',
    'depression',
    'addiction',
    'general',
  ]),
  modality: z.enum(['telehealth', 'in_person', 'either']),
  insurance: z.string().nullable(),
  timePreference: z.enum([
    'mornings',
    'afternoons',
    'evenings',
    'weekends',
    'any',
  ]),
});

export async function POST(request: NextRequest) {
  const start = Date.now();

  const authError = validateVapiSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = FindProvidersSchema.safeParse(body);

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

    if (process.env.NODE_ENV === 'development') {
      console.log('[findProviders] payload received:', JSON.stringify(parsed.data, null, 2));
    }

    const result = handleFindProviders(parsed.data);

    if (parsed.data.sessionId) {
      storeFindProviders(parsed.data.sessionId, result.providers, result.disclaimer);
    }

    await logToolCall({
      toolName: 'findProviders',
      sessionId: parsed.data.sessionId ?? null,
      success: true,
      durationMs: Date.now() - start,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logToolCall({
      toolName: 'findProviders',
      sessionId: null,
      success: false,
      durationMs: Date.now() - start,
      errorMessage: message,
    });

    return NextResponse.json(
      { error: 'Provider search failed' },
      { status: 500 }
    );
  }
}
