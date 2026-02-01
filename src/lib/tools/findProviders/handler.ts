/**
 * findProviders: dummy Zocdoc-style provider search.
 * Returns stable, deterministic sample results for testing.
 */

import type {
  FindProvidersInput,
  FindProvidersOutput,
  ProviderResult,
  ProviderModalityOutput,
} from '../types';

const SAMPLE_PROVIDERS: Array<{
  providerId: string;
  name: string;
  credentials: string;
  specialties: string[];
  modality: ProviderModalityOutput;
  city: string;
  state: string;
  zipBase: string;
  summary: string;
}> = [
  {
    providerId: 'prov-001',
    name: 'Dr. Sarah Chen',
    credentials: 'PsyD, Licensed Psychologist',
    specialties: ['Anxiety', 'Depression', 'CBT'],
    modality: 'telehealth',
    city: 'San Francisco',
    state: 'CA',
    zipBase: '94102',
    summary: 'Warm, evidence-based approach. Specializes in anxiety and mood.',
  },
  {
    providerId: 'prov-002',
    name: 'Michael Torres, LCSW',
    credentials: 'LCSW',
    specialties: ['Therapy', 'Addiction', 'Relationships'],
    modality: 'both',
    city: 'Oakland',
    state: 'CA',
    zipBase: '94612',
    summary: 'Experienced in substance use and couples work. Bilingual.',
  },
  {
    providerId: 'prov-003',
    name: 'Dr. James Williams',
    credentials: 'MD, Psychiatrist',
    specialties: ['Psychiatry', 'Depression', 'Anxiety'],
    modality: 'telehealth',
    city: 'Berkeley',
    state: 'CA',
    zipBase: '94701',
    summary: 'Board-certified psychiatrist. Medication management and therapy.',
  },
  {
    providerId: 'prov-004',
    name: 'Elena Rodriguez, LMFT',
    credentials: 'LMFT',
    specialties: ['Couples', 'Family', 'Sleep'],
    modality: 'in_person',
    city: 'San Jose',
    state: 'CA',
    zipBase: '95110',
    summary: 'Gottman-trained. Helps with sleep and relationship issues.',
  },
  {
    providerId: 'prov-005',
    name: 'Dr. Amara Okonkwo',
    credentials: 'PsyD, Licensed Psychologist',
    specialties: ['Trauma', 'Anxiety', 'Sleep'],
    modality: 'both',
    city: 'Palo Alto',
    state: 'CA',
    zipBase: '94301',
    summary: 'Trauma-informed and sleep-focused. Telehealth and in-person.',
  },
  {
    providerId: 'prov-006',
    name: 'David Kim, LCSW',
    credentials: 'LCSW',
    specialties: ['Addiction', 'General Therapy'],
    modality: 'telehealth',
    city: 'Los Angeles',
    state: 'CA',
    zipBase: '90001',
    summary: 'Recovery-focused. Motivational interviewing and CBT.',
  },
  {
    providerId: 'prov-007',
    name: 'Dr. Rachel Green',
    credentials: 'PhD, Licensed Psychologist',
    specialties: ['Couples', 'Anxiety', 'Depression'],
    modality: 'both',
    city: 'Sacramento',
    state: 'CA',
    zipBase: '95814',
    summary: 'Relationship specialist. Integrative approach.',
  },
];

/** Deterministic seeded hash for stability */
function seededHash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Generate next available slot 1–14 days in future (stable per zip+specialty) */
function nextAvailable(zip: string, specialty: string, index: number): Date {
  const seed = seededHash(`${zip}-${specialty}-${index}`);
  const daysAhead = 1 + (seed % 14);
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(9 + (seed % 6), (seed % 4) * 15, 0, 0);
  return d;
}

/** Distance in miles (dummy: based on zip hash) */
function distanceMiles(zip: string, zipBase: string, index: number): number {
  const seed = seededHash(`${zip}-${zipBase}-${index}`);
  return 1 + (seed % 12);
}

/** Filter providers by specialty overlap and modality, then sort by seeded score */
function selectAndRank(
  input: FindProvidersInput,
  count: number
): Array<(typeof SAMPLE_PROVIDERS)[0] & { score: number }> {
  const zip = input.zip;
  const spec = input.specialty;
  const mod = input.modality;

  const specialtyKeywords: Record<string, string[]> = {
    therapy: ['Therapy', 'General Therapy', 'CBT', 'Anxiety', 'Depression'],
    psychiatry: ['Psychiatry', 'Depression', 'Anxiety'],
    couples: ['Couples', 'Relationships', 'Family'],
    sleep: ['Sleep'],
    anxiety: ['Anxiety', 'CBT'],
    depression: ['Depression', 'Mood'],
    addiction: ['Addiction'],
    general: ['Therapy', 'General Therapy', 'Anxiety', 'Depression', 'Relationships'],
  };

  const keywords = specialtyKeywords[spec] ?? specialtyKeywords.general;
  const modalityOk = (p: typeof SAMPLE_PROVIDERS[0]) => {
    if (mod === 'either') return true;
    if (mod === 'telehealth') return p.modality === 'telehealth' || p.modality === 'both';
    if (mod === 'in_person') return p.modality === 'in_person' || p.modality === 'both';
    return true;
  };

  const scored = SAMPLE_PROVIDERS.filter((p) => {
    const hasSpec = keywords.some((k) =>
      p.specialties.some((s) => s.toLowerCase().includes(k.toLowerCase()))
    );
    return hasSpec && modalityOk(p);
  }).map((p, i) => {
    const score = seededHash(`${zip}-${spec}-${p.providerId}`) + i * 10;
    return { ...p, score };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, count);
}

export function handleFindProviders(input: FindProvidersInput): FindProvidersOutput {
  const count = 3 + (seededHash(`${input.zip}-${input.specialty}`) % 3);
  const selected = selectAndRank(input, Math.min(count, 5));

  const providers: ProviderResult[] = selected.map((p, i) => {
    const next = nextAvailable(input.zip, input.specialty, i);
    const dist = distanceMiles(input.zip, p.zipBase, i);
    const bookingUrl =
      seededHash(`${input.zip}-${p.providerId}`) % 3 === 0
        ? `https://zocdoc.com/providers/${p.providerId}`
        : null;

    return {
      providerId: p.providerId,
      name: p.name,
      credentials: p.credentials,
      specialties: p.specialties,
      modality: p.modality,
      location: {
        city: p.city,
        state: p.state,
        zip: input.zip,
      },
      distanceMiles: dist,
      nextAvailable: next.toISOString(),
      bookingUrl,
      summary: p.summary,
    };
  });

  return {
    providers,
    disclaimer:
      'These are sample results while provider search is in beta.',
  };
}
