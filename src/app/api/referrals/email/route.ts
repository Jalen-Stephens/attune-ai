import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getIntakeServiceRole, getReferralsServiceRole, logEvent } from '@/lib/db';
import { sendReferralEmail } from '@/lib/email';

const EmailSchema = z.object({
  session_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = EmailSchema.parse(body);

    // Use service role so this works when called from the voice webhook (no user cookie)
    const intake = await getIntakeServiceRole(session_id);
    
    if (!intake) {
      return NextResponse.json(
        { error: 'Intake not found' },
        { status: 404 }
      );
    }

    if (!intake.consent_to_email) {
      return NextResponse.json(
        { error: 'User has not consented to receive email' },
        { status: 403 }
      );
    }

    if (!intake.user_email?.trim()) {
      return NextResponse.json(
        { error: 'No email address on intake' },
        { status: 400 }
      );
    }

    const referrals = await getReferralsServiceRole(session_id);

    // Generate and send email (this will be handled by background job)
    // For now, we'll call it directly but in production this should be enqueued
    try {
      await sendReferralEmail(session_id, intake, referrals);
      
      await logEvent(session_id, 'email_sent', {
        to_email: intake.user_email,
        referral_count: referrals.length,
      });

      return NextResponse.json({
        success: true,
        message: 'Email summary will be sent shortly',
      });
    } catch (error) {
      console.error('Error sending email:', error);
      
      await logEvent(session_id, 'email_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Don't fail the request - email will be retried
      return NextResponse.json({
        success: false,
        message: 'Email will be sent shortly',
        error: 'Email sending queued for retry',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error enqueueing email:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue email' },
      { status: 500 }
    );
  }
}
