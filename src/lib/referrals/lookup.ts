/**
 * Shared referral lookup logic (Google Places).
 * Used by POST /api/referrals/lookup and by lookupSpecialistsTool so the
 * voice agent does not depend on the server calling its own HTTP endpoint.
 */

import { getIntake, saveReferrals, logEvent } from '@/lib/db';
import { searchTherapists } from '@/lib/google-places/searchTherapists';
import type { Referral } from '@/lib/types';

export interface ReferralLookupResult {
  success: boolean;
  referrals: Array<{
    id: string;
    provider_name: string;
    provider_credentials: string | null;
    specialty: string;
    location: {
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      distance_miles: number | null;
    };
    next_available_date: string | null;
    booking_url: string;
    accepted_insurance: string[] | null;
    rating: number | null;
    review_count: number | null;
    match_reasons: string[] | null;
    rank: number;
  }>;
  message?: string;
  error?: string;
}

/**
 * Run referral lookup for a session: load intake, search Google Places, save referrals.
 * Call this from the API route or from the voice agent tool—no HTTP self-call.
 */
export async function runReferralLookup(sessionId: string): Promise<ReferralLookupResult> {
  const intake = await getIntake(sessionId);

  if (!intake) {
    return {
      success: false,
      referrals: [],
      message: 'Intake not found. Please complete intake first.',
    };
  }

  if (!intake.consent_to_use_info) {
    return {
      success: false,
      referrals: [],
      message: 'User has not consented to use information for referrals',
    };
  }

  const specialtyKeyword = intake.recommended_specialty?.trim() || undefined;

  try {
    const providers = await searchTherapists({
      zip: intake.location_zip || undefined,
      city: intake.location_city || undefined,
      state: intake.location_state || undefined,
      radiusMeters: 25 * 1609.34,
      specialtyKeyword,
    });

    if (providers.length === 0) {
      await logEvent(sessionId, 'referrals_returned', {
        count: 0,
        reason: 'no_providers_found',
      });
      return {
        success: true,
        referrals: [],
        message: 'No providers found matching your criteria. We will email you options shortly.',
      };
    }

    const referralRows: Omit<Referral, 'id' | 'created_at'>[] = providers.map((provider, index) => {
      const bookingUrl =
        provider.websiteUri ||
        provider.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(provider.place_id)}`;
      const score = 1 - index * 0.1;
      const rank = index + 1;
      return {
        session_id: sessionId,
        provider_id: provider.place_id,
        provider_name: provider.name,
        provider_credentials: null,
        specialty: specialtyKeyword || 'therapist',
        location_address: provider.formattedAddress || null,
        location_city: null,
        location_state: null,
        location_zip: intake.location_zip || null,
        distance_miles: provider.distanceMiles ?? null,
        next_available_date: null,
        booking_url: bookingUrl,
        zocdoc_url: null,
        place_id: provider.place_id,
        accepted_insurance: null,
        rating: provider.rating ?? null,
        review_count: provider.userRatingCount ?? null,
        score,
        rank,
        match_reasons: provider.matchReasons,
      };
    });

    await saveReferrals(sessionId, referralRows);

    await logEvent(sessionId, 'referrals_returned', {
      count: referralRows.length,
      provider_ids: referralRows.map((r) => r.provider_id),
    });

    return {
      success: true,
      referrals: referralRows.map((ref) => ({
        id: ref.provider_id,
        provider_name: ref.provider_name,
        provider_credentials: ref.provider_credentials ?? null,
        specialty: ref.specialty,
        location: {
          address: ref.location_address ?? null,
          city: ref.location_city ?? null,
          state: ref.location_state ?? null,
          zip: ref.location_zip ?? null,
          distance_miles: ref.distance_miles ?? null,
        },
        next_available_date: ref.next_available_date ?? null,
        booking_url: ref.booking_url,
        accepted_insurance: ref.accepted_insurance ?? null,
        rating: ref.rating ?? null,
        review_count: ref.review_count ?? null,
        match_reasons: ref.match_reasons ?? null,
        rank: ref.rank,
      })),
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error('[referrals/lookup] Provider search failed:', errMessage, errStack);

    await logEvent(sessionId, 'provider_search_error', {
      error: errMessage,
    });

    return {
      success: false,
      referrals: [],
      message: 'We encountered an issue finding providers. We will email you options shortly.',
      error: 'Provider search failed',
    };
  }
}
