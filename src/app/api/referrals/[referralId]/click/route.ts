import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logEvent } from '@/lib/db';

interface RouteParams {
  params: Promise<{ referralId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { referralId } = await params;
    const sessionId = request.nextUrl.searchParams.get('session_id');
    const redirectUrl = request.nextUrl.searchParams.get('redirect');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // Log referral click
    await logEvent(sessionId, 'referral_clicked', {
      referral_id: referralId,
      redirect_url: redirectUrl,
      timestamp: new Date().toISOString(),
    });

    // Redirect to booking URL
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.json({
      success: true,
      message: 'Referral click tracked',
    });
  } catch (error) {
    console.error('Error tracking referral click:', error);
    // Still redirect even if tracking fails
    const redirectUrl = request.nextUrl.searchParams.get('redirect');
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
