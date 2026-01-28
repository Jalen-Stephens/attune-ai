import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrUpdateIntake, logEvent } from '@/lib/db';

const IntakeSchema = z.object({
  session_id: z.string().uuid(),
  reason_for_visit: z.string().optional(),
  symptoms: z.string().optional(),
  duration: z.string().optional(),
  urgency_flags: z.array(z.string()).optional(),
  location_zip: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_plan: z.string().optional(),
  appointment_preference: z.enum(['in-person', 'telehealth', 'either']).optional(),
  user_email: z.string().email(),
  consent_to_use_info: z.boolean().default(false),
  consent_to_email: z.boolean().default(false),
  recommended_specialty: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = IntakeSchema.parse(body);

    // Create or update intake
    const intake = await createOrUpdateIntake(
      validatedData.session_id,
      validatedData
    );

    // Log event
    await logEvent(validatedData.session_id, 'intake_completed', {
      has_reason: !!validatedData.reason_for_visit,
      has_location: !!validatedData.location_zip,
      has_insurance: !!validatedData.insurance_provider,
      consent_to_use_info: validatedData.consent_to_use_info,
      consent_to_email: validatedData.consent_to_email,
    });

    return NextResponse.json({ success: true, intake }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating/updating intake:', error);
    return NextResponse.json(
      { error: 'Failed to process intake' },
      { status: 500 }
    );
  }
}
