/**
 * Agent Tools
 *
 * Functions that the AI agent can call during conversations to:
 * - Collect intake information
 * - Lookup specialists
 * - Send referral emails
 */

import { createOrUpdateIntakeServiceRole, getIntakeServiceRole, logEvent, insertSessionResource } from './db';
import { runReferralLookup } from './referrals/lookup';
import { logToolCall } from './tools/_logger';
import type { Intake } from './types';

/** Map referral from runReferralLookup to the shape expected by ProviderCards / timeline / session_resources */
function referralsToProviderCardItems(
  referrals: Array<{
    id: string;
    provider_name: string;
    specialty: string;
    location: { address: string | null; city: string | null; state: string | null; zip: string | null; distance_miles: number | null };
    booking_url: string;
    match_reasons: string[] | null;
  }>
): Array<{ name?: string; bookingUrl?: string | null; summary?: string; specialties?: string[]; location?: { city?: string; state?: string; zip?: string }; distanceMiles?: number; providerId?: string }> {
  return referrals.map((ref) => {
    const locationParts = [ref.location?.address, ref.location?.city, ref.location?.state, ref.location?.zip].filter(Boolean);
    const summaryParts = [...locationParts];
    if (ref.match_reasons?.length) summaryParts.push(ref.match_reasons.join(', '));
    return {
      providerId: ref.id,
      name: ref.provider_name,
      bookingUrl: ref.booking_url,
      summary: summaryParts.join(' · ') || undefined,
      specialties: ref.specialty ? [ref.specialty] : [],
      location: ref.location
        ? { city: ref.location.city ?? undefined, state: ref.location.state ?? undefined, zip: ref.location.zip ?? undefined }
        : undefined,
      distanceMiles: ref.location?.distance_miles ?? undefined,
    };
  });
}

/**
 * Tool: Create or update intake
 * Called by agent when collecting user information
 */
export async function createOrUpdateIntakeTool(
  sessionId: string,
  params: {
    reason_for_visit?: string;
    symptoms?: string;
    duration?: string;
    urgency_flags?: string[];
    location_zip?: string;
    location_city?: string;
    location_state?: string;
    insurance_provider?: string;
    insurance_plan?: string;
    appointment_preference?: 'in-person' | 'telehealth' | 'either';
    user_email: string;
    consent_to_use_info?: boolean;
    consent_to_email?: boolean;
    recommended_specialty?: string;
  }
): Promise<{ success: boolean; message: string; intake?: Intake }> {
  try {
    const intake = await createOrUpdateIntakeServiceRole(sessionId, params);
    
    await logEvent(sessionId, 'intake_updated', {
      has_reason: !!params.reason_for_visit,
      has_location: !!params.location_zip,
      has_insurance: !!params.insurance_provider,
    });

    return {
      success: true,
      message: 'Intake information saved successfully',
      intake,
    };
  } catch (error) {
    console.error('Error in createOrUpdateIntakeTool:', error);
    return {
      success: false,
      message: 'Failed to save intake information',
    };
  }
}

/**
 * Tool: Lookup specialists
 * Called by agent after intake is complete
 */
export async function lookupSpecialistsTool(
  sessionId: string
): Promise<{ 
  success: boolean; 
  message: string; 
  referrals?: Array<{
    provider_name: string;
    specialty: string;
    location: string;
    booking_url: string;
    match_reasons: string[];
  }>;
}> {
  try {
    const intake = await getIntakeServiceRole(sessionId);
    
    if (!intake) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[lookupSpecialists] No intake for session', sessionId, '— ensure createOrUpdateIntake was called first and sessionId is consistent for the call.');
      }
      return {
        success: false,
        message: 'Please complete intake information first. I need to know your reason for visit, location, and insurance.',
      };
    }

    if (!intake.consent_to_use_info) {
      return {
        success: false,
        message: 'I need your consent to use your information to find specialists. Can I proceed?',
      };
    }

    // Run referral lookup directly (no HTTP self-call—fixes voice agent in production)
    const data = await runReferralLookup(sessionId);

    if (!data.success || !data.referrals || data.referrals.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[lookupSpecialists] No results:', data.message, 'sessionId=', sessionId);
      }
      return {
        success: false,
        message: data.message || 'I encountered an issue finding specialists. I will email you options shortly.',
      };
    }

    try {
      await logEvent(sessionId, 'referrals_looked_up', { count: data.referrals.length });
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[lookupSpecialists] logEvent failed (non-fatal):', e);
      }
    }

    const disclaimer = 'Results from Google Places. Contact providers for availability and insurance.';
    const providersForDisplay = referralsToProviderCardItems(data.referrals);
    try {
      await insertSessionResource(sessionId, 'provider', {
        providers: providersForDisplay,
        disclaimer,
      });
      await logToolCall({
        toolName: 'findProviders',
        sessionId,
        success: true,
        durationMs: 0,
        payload: { providers: providersForDisplay, disclaimer },
      });
    } catch (err) {
      console.error('Failed to write session_resources/tool event for voice referrals:', err);
    }

    return {
      success: true,
      message: `I found ${data.referrals.length} specialist${data.referrals.length > 1 ? 's' : ''} for you.`,
      referrals: data.referrals.map((ref) => ({
        provider_name: ref.provider_name,
        specialty: ref.specialty,
        location: [
          ref.location?.address,
          ref.location?.city,
          ref.location?.state,
          ref.location?.zip,
        ]
          .filter(Boolean)
          .join(', '),
        booking_url: ref.booking_url,
        match_reasons: ref.match_reasons || [],
      })),
    };
  } catch (error) {
    console.error('Error in lookupSpecialistsTool:', error);
    await logEvent(sessionId, 'referral_lookup_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      message: 'I encountered an issue finding specialists. I will email you options shortly.',
    };
  }
}

/**
 * Tool: Send referral email
 * Called by agent to enqueue email summary
 */
export async function sendReferralEmailTool(
  sessionId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const intake = await getIntakeServiceRole(sessionId);
    
    if (!intake) {
      return {
        success: false,
        message: 'Intake information not found.',
      };
    }

    if (!intake.consent_to_email) {
      return {
        success: false,
        message: 'User has not consented to receive email.',
      };
    }

    // Call the email API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/referrals/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    const data = await response.json();

    if (data.success) {
      await logEvent(sessionId, 'email_enqueued', {
        to_email: intake.user_email,
      });
    }

    return {
      success: data.success,
      message: data.message || 'Email summary will be sent shortly.',
    };
  } catch (error) {
    console.error('Error in sendReferralEmailTool:', error);
    return {
      success: false,
      message: 'Failed to send email summary.',
    };
  }
}
