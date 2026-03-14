/**
 * Google Places API (New) and Geocoding API client.
 * Handles authentication, retries, and timeouts.
 */

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api/geocode';
const PLACES_TIMEOUT_MS = 10000;
const PLACES_MAX_RETRIES = 3;
const PLACES_RETRY_DELAY_MS = 1000;

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_GEOCODING_API_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY ?? GOOGLE_PLACES_API_KEY;

export class GooglePlacesClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'GooglePlacesClientError';
  }
}

async function placesRequest<T>(
  method: string,
  path: string,
  body: unknown,
  fieldMask: string
): Promise<T> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new GooglePlacesClientError(
      'GOOGLE_PLACES_API_KEY environment variable is not set',
      'MISSING_API_KEY',
      500,
      false
    );
  }

  const url = `${PLACES_API_BASE}${path}`;
  let lastError: GooglePlacesClientError | null = null;

  for (let attempt = 0; attempt <= PLACES_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': fieldMask,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Google Places] API error', {
          status: response.status,
          path,
          body: errText?.slice(0, 500),
        });
        const isRetryable = response.status >= 500 || response.status === 429;
        const clientError = new GooglePlacesClientError(
          errText || `HTTP ${response.status}`,
          undefined,
          response.status,
          isRetryable && attempt < PLACES_MAX_RETRIES
        );

        if (!isRetryable || attempt === PLACES_MAX_RETRIES) {
          throw clientError;
        }
        lastError = clientError;
        await new Promise((r) =>
          setTimeout(r, PLACES_RETRY_DELAY_MS * Math.pow(2, attempt))
        );
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof GooglePlacesClientError) {
        if (!error.retryable || attempt === PLACES_MAX_RETRIES) throw error;
        lastError = error;
      } else if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new GooglePlacesClientError(
          'Request timeout',
          'TIMEOUT',
          408,
          attempt < PLACES_MAX_RETRIES
        );
        if (attempt === PLACES_MAX_RETRIES) throw timeoutError;
        lastError = timeoutError;
      } else {
        const netError = new GooglePlacesClientError(
          error instanceof Error ? error.message : 'Unknown error',
          'NETWORK_ERROR',
          0,
          attempt < PLACES_MAX_RETRIES
        );
        if (attempt === PLACES_MAX_RETRIES) throw netError;
        lastError = netError;
      }
      await new Promise((r) =>
        setTimeout(r, PLACES_RETRY_DELAY_MS * Math.pow(2, attempt))
      );
    }
  }

  throw lastError ?? new GooglePlacesClientError('Request failed after retries', 'RETRY_EXHAUSTED', 0, false);
}

/** Places API (New) searchText response place shape (subset we use) */
export interface PlaceResult {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
}

export interface SearchTextResponse {
  places?: PlaceResult[];
  nextPageToken?: string;
}

/**
 * Text search for places (e.g. "therapist" near a location).
 * Uses locationBias circle for radius-based search.
 */
export async function searchText(request: {
  textQuery: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  pageSize?: number;
  languageCode?: string;
}): Promise<SearchTextResponse> {
  const {
    textQuery,
    latitude,
    longitude,
    radiusMeters = 25000,
    pageSize = 10,
    languageCode = 'en',
  } = request;

  return placesRequest<SearchTextResponse>(
    'POST',
    '/places:searchText',
    {
      textQuery,
      languageCode,
      pageSize,
      locationBias: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
      rankPreference: 'DISTANCE',
    },
    [
      'places.id',
      'places.name',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.websiteUri',
      'places.googleMapsUri',
      'places.nationalPhoneNumber',
    ].join(',')
  );
}

/** Geocoding API response (subset we use) */
interface GeocodeResult {
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  formatted_address?: string;
}

interface GeocodeResponse {
  results?: GeocodeResult[];
  status?: string;
  error_message?: string;
}

/**
 * Convert address or zip to lat/lng using Geocoding API.
 * Uses GOOGLE_GEOCODING_API_KEY or falls back to GOOGLE_PLACES_API_KEY.
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = GOOGLE_GEOCODING_API_KEY ?? GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.warn('No Geocoding API key configured');
    return null;
  }

  const url = `${GEOCODING_API_BASE}/json?address=${encodeURIComponent(address)}&key=${key}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Geocoding] request failed', { status: response.status, address });
      return null;
    }
    const data = (await response.json()) as GeocodeResponse;
    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('[Geocoding] no results or error', {
        status: data.status,
        error_message: data.error_message,
        address,
      });
      return null;
    }
    const loc = data.results[0].geometry?.location;
    if (!loc || loc.lat == null || loc.lng == null) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (e) {
    console.warn('[Geocoding] exception', { address, error: e instanceof Error ? e.message : e });
    return null;
  }
}
