import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getIntake, saveReferrals, logEvent } from '@/lib/db';
import { searchAndScoreProviders, mapSpecialtyKeyword } from '@/lib/zocdoc/searchProviders';
import type { Referral } from '@/lib/types';

const LookupSchema = z.object({
  session_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = LookupSchema.parse(body);

    // Get intake data
    const intake = await getIntake(session_id);
    
    if (!intake) {
      return NextResponse.json(
        { error: 'Intake not found. Please complete intake first.' },
        { status: 404 }
      );
    }

    if (!intake.consent_to_use_info) {
      return NextResponse.json(
        { error: 'User has not consented to use information for referrals' },
        { status: 403 }
      );
    }

    // Map specialty keyword if provided
    const specialty = intake.recommended_specialty 
      ? mapSpecialtyKeyword(intake.recommended_specialty)
      : undefined;

    // Build search params (convert null to undefined for type compatibility)
    const searchParams = {
      specialty,
      condition: intake.reason_for_visit || intake.symptoms || undefined,
      zip: intake.location_zip || undefined,
      city: intake.location_city || undefined,
      state: intake.location_state || undefined,
      radius: 25, // Default 25 miles
      insurance: intake.insurance_provider || undefined,
      appointment_type: (intake.appointment_preference || 'either') as 'in-person' | 'telehealth' | 'either',
    };

    try {
      // Search and score providers
      const scoredProviders = await searchAndScoreProviders(searchParams);

      if (scoredProviders.length === 0) {
        await logEvent(session_id, 'referrals_returned', {
          count: 0,
          reason: 'no_providers_found',
        });

        return NextResponse.json({
          success: true,
          referrals: [],
          message: 'No providers found matching your criteria. We will email you options shortly.',
        });
      }

      // Convert to referral format for database
      const referrals: Omit<Referral, 'id' | 'created_at'>[] = scoredProviders.map(provider => ({
        session_id,
        provider_id: provider.id,
        provider_name: provider.name,
        provider_credentials: provider.credentials || null,
        specialty: provider.specialties[0] || specialty || 'general',
        location_address: provider.addresses[0]?.address || null,
        location_city: provider.addresses[0]?.city || null,
        location_state: provider.addresses[0]?.state || null,
        location_zip: provider.addresses[0]?.zip || null,
        distance_miles: provider.addresses[0]?.distance || null,
        next_available_date: provider.next_available || null,
        booking_url: provider.booking_url,
        zocdoc_url: provider.booking_url, // Use booking URL as Zocdoc URL
        accepted_insurance: provider.accepted_insurance || null,
        rating: provider.rating || null,
        review_count: provider.review_count || null,
        score: provider.score,
        rank: provider.rank || 1,
        match_reasons: provider.match_reasons || null,
      }));

      // Save referrals
      await saveReferrals(session_id, referrals);

      // Log event
      await logEvent(session_id, 'referrals_returned', {
        count: referrals.length,
        provider_ids: referrals.map(r => r.provider_id),
      });

      return NextResponse.json({
        success: true,
        referrals: referrals.map(ref => ({
          id: ref.provider_id, // Use provider_id as temporary ID
          provider_name: ref.provider_name,
          provider_credentials: ref.provider_credentials,
          specialty: ref.specialty,
          location: {
            address: ref.location_address,
            city: ref.location_city,
            state: ref.location_state,
            zip: ref.location_zip,
            distance_miles: ref.distance_miles,
          },
          next_available_date: ref.next_available_date,
          booking_url: ref.booking_url,
          accepted_insurance: ref.accepted_insurance,
          rating: ref.rating,
          review_count: ref.review_count,
          match_reasons: ref.match_reasons,
          rank: ref.rank,
        })),
      });
    } catch (error) {
      console.error('Error searching providers:', error);
      
      await logEvent(session_id, 'zocdoc_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Graceful fallback
      return NextResponse.json({
        success: false,
        referrals: [],
        message: 'We encountered an issue finding providers. We will email you options shortly.',
        error: 'Provider search failed',
      });
    }
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
