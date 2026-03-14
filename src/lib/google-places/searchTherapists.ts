/**
 * Search for therapists / mental health providers using Google Places API.
 * Geocodes location (zip/city/state) then runs text search with location bias.
 */

import { searchText, geocode } from './client';
import type { PlaceResult } from './client';

export interface TherapistSearchParams {
  /** Zip code (preferred for US) */
  zip?: string;
  /** City name */
  city?: string;
  /** State code (e.g. CA) */
  state?: string;
  /** Pre-resolved lat/lng; if set, skips geocoding */
  latitude?: number;
  longitude?: number;
  /** Search radius in meters (default 25 mi ≈ 40233) */
  radiusMeters?: number;
  /** Optional specialty keyword to narrow query (e.g. "anxiety", "couples") */
  specialtyKeyword?: string;
}

export interface PlaceProvider {
  place_id: string;
  name: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  /** Distance in miles (approximate from center if we have lat/lng) */
  distanceMiles?: number;
  /** Simple match reasons for UI */
  matchReasons: string[];
}

const DEFAULT_RADIUS_METERS = 40233; // ~25 miles
const TOP_N = 5;

/** Build a single-line address for geocoding from zip/city/state */
function buildAddressForGeocode(params: {
  zip?: string;
  city?: string;
  state?: string;
}): string {
  const parts: string[] = [];
  if (params.zip) parts.push(params.zip);
  if (params.city) parts.push(params.city);
  if (params.state) parts.push(params.state);
  return parts.join(', ') || '';
}

/** Haversine distance in miles (approximate) */
function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function placeToProvider(
  place: PlaceResult,
  centerLat?: number,
  centerLng?: number
): PlaceProvider {
  const placeId = place.id ?? place.name?.replace('places/', '') ?? '';
  const name = place.displayName?.text ?? place.name ?? 'Unknown';
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  let distanceMiles: number | undefined;
  if (
    centerLat != null &&
    centerLng != null &&
    lat != null &&
    lng != null
  ) {
    distanceMiles = Math.round(haversineMiles(centerLat, centerLng, lat, lng) * 10) / 10;
  }
  const matchReasons: string[] = [];
  if (distanceMiles != null && distanceMiles <= 5) matchReasons.push('very close');
  else if (distanceMiles != null && distanceMiles <= 15) matchReasons.push('nearby');
  if (place.rating != null && place.rating >= 4.0 && (place.userRatingCount ?? 0) >= 10) {
    matchReasons.push('highly rated');
  }
  if (matchReasons.length === 0) matchReasons.push('available');

  return {
    place_id: placeId,
    name,
    formattedAddress: place.formattedAddress,
    location:
      lat != null && lng != null ? { latitude: lat, longitude: lng } : undefined,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    websiteUri: place.websiteUri,
    googleMapsUri: place.googleMapsUri,
    nationalPhoneNumber: place.nationalPhoneNumber,
    distanceMiles,
    matchReasons,
  };
}

/**
 * Search for therapists (and similar) near the given location.
 * If only zip/city/state are provided, geocodes first. Returns up to TOP_N results.
 */
export async function searchTherapists(
  params: TherapistSearchParams
): Promise<PlaceProvider[]> {
  let lat = params.latitude;
  let lng = params.longitude;

  if (lat == null || lng == null) {
    const address = buildAddressForGeocode({
      zip: params.zip,
      city: params.city,
      state: params.state,
    });
    if (!address) {
      console.warn('[searchTherapists] no location provided (zip/city/state missing)');
      return [];
    }
    const coords = await geocode(address);
    if (!coords) {
      console.warn('[searchTherapists] geocoding failed for address:', address);
      return [];
    }
    lat = coords.lat;
    lng = coords.lng;
  }

  const radius = params.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const query =
    params.specialtyKeyword?.trim().length
      ? `${params.specialtyKeyword} therapist`
      : 'therapist';

  try {
    const response = await searchText({
      textQuery: query,
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      pageSize: TOP_N,
    });

    const places = response.places ?? [];
    if (places.length === 0) {
      console.warn('[searchTherapists] Places API returned 0 results', {
        query,
        lat,
        lng,
        radiusMeters: radius,
      });
    }
    const providers = places.map((p) => placeToProvider(p, lat, lng));
    return providers;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'MISSING_API_KEY'
    ) {
      console.warn('[searchTherapists] GOOGLE_PLACES_API_KEY not set, returning empty results');
      return [];
    }
    console.error('[searchTherapists] Places API error', {
      query,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}
