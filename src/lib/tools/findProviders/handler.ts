/**
 * findProviders: search for therapists via Google Places API.
 * Uses the same searchTherapists module as referrals lookup.
 */

import { searchTherapists } from '@/lib/google-places/searchTherapists';
import type {
  FindProvidersInput,
  FindProvidersOutput,
  ProviderResult,
  ProviderModalityOutput,
} from '../types';

/** Map our specialty to an optional keyword for Places query */
function specialtyToKeyword(specialty: FindProvidersInput['specialty']): string | undefined {
  const map: Record<string, string> = {
    therapy: 'therapy',
    psychiatry: 'psychiatrist',
    couples: 'couples therapy',
    sleep: 'sleep therapist',
    anxiety: 'anxiety',
    depression: 'depression',
    addiction: 'addiction',
    general: '',
  };
  const kw = map[specialty];
  return kw === '' ? undefined : kw;
}

export async function handleFindProviders(
  input: FindProvidersInput
): Promise<FindProvidersOutput> {
  try {
    const providers = await searchTherapists({
      zip: input.zip,
      radiusMeters: 25 * 1609.34,
      specialtyKeyword: specialtyToKeyword(input.specialty),
    });

    const modality: ProviderModalityOutput = input.modality === 'either' ? 'both' : input.modality;

    const results: ProviderResult[] = providers.slice(0, 5).map((p) => {
      const bookingUrl =
        p.websiteUri ||
        p.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(p.place_id)}`;
      const summary = [
        p.formattedAddress,
        p.rating != null ? `${p.rating} rating` : '',
        p.matchReasons.length ? p.matchReasons.join(', ') : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'Mental health provider.';

      return {
        providerId: p.place_id,
        name: p.name,
        credentials: '',
        specialties: ['Therapist'],
        modality,
        location: {
          city: '',
          state: '',
          zip: input.zip,
        },
        distanceMiles: p.distanceMiles ?? 0,
        nextAvailable: '',
        bookingUrl,
        summary,
      };
    });

    return {
      providers: results,
      disclaimer:
        'Results from Google Places. Contact providers for availability and insurance.',
    };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'MISSING_API_KEY'
    ) {
      return {
        providers: [],
        disclaimer: 'Provider search is not configured. Please try again later.',
      };
    }
    throw error;
  }
}
