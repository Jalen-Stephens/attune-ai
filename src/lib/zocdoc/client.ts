/**
 * Zocdoc API Client
 * 
 * Handles authentication, retries, timeouts, and rate limiting for Zocdoc API calls.
 * 
 * Note: This is a placeholder implementation. Replace with actual Zocdoc API integration.
 * Zocdoc API documentation: https://docs.zocdoc.com/
 */

const ZOCDOC_API_BASE = process.env.ZOCDOC_API_BASE_URL || 'https://api.zocdoc.com/v1';
const ZOCDOC_API_KEY = process.env.ZOCDOC_API_KEY;
const ZOCDOC_TIMEOUT_MS = 10000; // 10 seconds
const ZOCDOC_MAX_RETRIES = 3;
const ZOCDOC_RETRY_DELAY_MS = 1000;

interface ZocdocApiError {
  message: string;
  code?: string;
  status?: number;
}

class ZocdocClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ZocdocClientError';
  }
}

/**
 * Make a request to Zocdoc API with retries and timeout
 */
async function zocdocRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!ZOCDOC_API_KEY) {
    throw new ZocdocClientError(
      'ZOCDOC_API_KEY environment variable is not set',
      'MISSING_API_KEY',
      500,
      false
    );
  }

  const url = `${ZOCDOC_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${ZOCDOC_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let lastError: ZocdocClientError | null = null;

  for (let attempt = 0; attempt <= ZOCDOC_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ZOCDOC_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ZocdocApiError = errorData.error || { message: response.statusText };
        
        const isRetryable = response.status >= 500 || response.status === 429;
        const clientError = new ZocdocClientError(
          error.message || `HTTP ${response.status}`,
          error.code,
          response.status,
          isRetryable && attempt < ZOCDOC_MAX_RETRIES
        );

        if (!isRetryable || attempt === ZOCDOC_MAX_RETRIES) {
          throw clientError;
        }

        lastError = clientError;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, ZOCDOC_RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ZocdocClientError) {
        if (!error.retryable || attempt === ZOCDOC_MAX_RETRIES) {
          throw error;
        }
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, ZOCDOC_RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ZocdocClientError(
          'Request timeout',
          'TIMEOUT',
          408,
          attempt < ZOCDOC_MAX_RETRIES
        );
      }

      // Network error or other unexpected error
      if (attempt === ZOCDOC_MAX_RETRIES) {
        throw new ZocdocClientError(
          error instanceof Error ? error.message : 'Unknown error',
          'NETWORK_ERROR',
          0,
          false
        );
      }

      lastError = new ZocdocClientError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR',
        0,
        true
      );
      await new Promise(resolve => setTimeout(resolve, ZOCDOC_RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }

  throw lastError || new ZocdocClientError('Request failed after retries', 'RETRY_EXHAUSTED', 0, false);
}

/**
 * Search for providers using Zocdoc API
 * 
 * This is a placeholder implementation. Replace with actual Zocdoc API endpoint.
 * Expected Zocdoc API format:
 * GET /providers/search?specialty=...&zip=...&insurance=...&appointment_type=...
 */
export async function searchProviders(params: {
  specialty?: string;
  condition?: string;
  zip?: string;
  city?: string;
  state?: string;
  radius?: number;
  insurance?: string;
  appointment_type?: 'in-person' | 'telehealth' | 'either';
  availability_window?: {
    start: string;
    end: string;
  };
}): Promise<Array<{
  id: string;
  name: string;
  credentials?: string;
  specialties: string[];
  addresses: Array<{
    address: string;
    city: string;
    state: string;
    zip: string;
    distance?: number;
  }>;
  next_available?: string;
  booking_url: string;
  accepted_insurance?: string[];
  rating?: number;
  review_count?: number;
}>> {
  // Build query parameters
  const queryParams = new URLSearchParams();
  
  if (params.specialty) {
    queryParams.append('specialty', params.specialty);
  }
  if (params.condition) {
    queryParams.append('condition', params.condition);
  }
  if (params.zip) {
    queryParams.append('zip', params.zip);
  }
  if (params.city) {
    queryParams.append('city', params.city);
  }
  if (params.state) {
    queryParams.append('state', params.state);
  }
  if (params.radius) {
    queryParams.append('radius', params.radius.toString());
  }
  if (params.insurance) {
    queryParams.append('insurance', params.insurance);
  }
  if (params.appointment_type && params.appointment_type !== 'either') {
    queryParams.append('appointment_type', params.appointment_type);
  }
  if (params.availability_window) {
    queryParams.append('availability_start', params.availability_window.start);
    queryParams.append('availability_end', params.availability_window.end);
  }

  const endpoint = `/providers/search?${queryParams.toString()}`;

  try {
    const response = await zocdocRequest<{
      providers: Array<{
        id: string;
        name: string;
        credentials?: string;
        specialties: string[];
        locations: Array<{
          address: string;
          city: string;
          state: string;
          zip: string;
          distance_miles?: number;
        }>;
        next_available_appointment?: string;
        booking_url: string;
        accepted_insurance?: string[];
        rating?: number;
        review_count?: number;
      }>;
    }>(endpoint);

    // Normalize response to our format
    return (response.providers || []).map(provider => ({
      id: provider.id,
      name: provider.name,
      credentials: provider.credentials,
      specialties: provider.specialties,
      addresses: provider.locations.map(loc => ({
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zip: loc.zip,
        distance: loc.distance_miles,
      })),
      next_available: provider.next_available_appointment,
      booking_url: provider.booking_url,
      accepted_insurance: provider.accepted_insurance,
      rating: provider.rating,
      review_count: provider.review_count,
    }));
  } catch (error) {
    // If API key is not set, return empty array (graceful fallback for development)
    if (error instanceof ZocdocClientError && error.code === 'MISSING_API_KEY') {
      console.warn('Zocdoc API key not configured, returning empty results');
      return [];
    }
    throw error;
  }
}

export { ZocdocClientError };
