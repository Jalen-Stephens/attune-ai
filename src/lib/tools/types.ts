/**
 * Shared types for Vapi server-side tools.
 */

// ─── findProviders ─────────────────────────────────────────────────────────

export type ProviderSpecialty =
  | 'therapy'
  | 'psychiatry'
  | 'couples'
  | 'sleep'
  | 'anxiety'
  | 'depression'
  | 'addiction'
  | 'general';

export type ProviderModality = 'telehealth' | 'in_person' | 'either';

export type TimePreference =
  | 'mornings'
  | 'afternoons'
  | 'evenings'
  | 'weekends'
  | 'any';

export interface FindProvidersInput {
  zip: string;
  specialty: ProviderSpecialty;
  modality: ProviderModality;
  insurance: string | null;
  timePreference: TimePreference;
}

export type ProviderModalityOutput = 'telehealth' | 'in_person' | 'both';

export interface ProviderLocation {
  city: string;
  state: string;
  zip: string;
}

export interface ProviderResult {
  providerId: string;
  name: string;
  credentials: string;
  specialties: string[];
  modality: ProviderModalityOutput;
  location: ProviderLocation;
  distanceMiles: number;
  nextAvailable: string;
  bookingUrl: string | null;
  summary: string;
}

export interface FindProvidersOutput {
  providers: ProviderResult[];
  disclaimer: string;
}

// ─── getRagResources ───────────────────────────────────────────────────────

export interface GetRagResourcesInput {
  sessionId: string;
  topic: string | null;
  userMessage: string | null;
  agentId: string | null;
}

export interface RagResourceCard {
  title: string;
  type: string;
  url: string | null;
  snippet: string;
  why: string;
}

export interface GetRagResourcesOutput {
  resources: RagResourceCard[];
}
