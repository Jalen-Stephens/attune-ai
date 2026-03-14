import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runReferralLookup } from '@/lib/referrals/lookup';

const LookupSchema = z.object({
  session_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = LookupSchema.parse(body);

    const result = await runReferralLookup(session_id);

    if (!result.success && result.referrals.length === 0) {
      if (result.message?.includes('Intake not found')) {
        return NextResponse.json(
          { error: result.message },
          { status: 404 }
        );
      }
      if (result.message?.includes('consent')) {
        return NextResponse.json(
          { error: result.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: result.success,
      referrals: result.referrals,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error looking up referrals:', error);
    return NextResponse.json(
      { error: 'Failed to lookup referrals' },
      { status: 500 }
    );
  }
}
