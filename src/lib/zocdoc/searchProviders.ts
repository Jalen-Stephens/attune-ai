/**
 * Provider Search and Scoring Service
 * 
 * Searches Zocdoc for providers and scores/ranks them based on:
 * - Specialty match
 * - Distance
 * - Next availability
 * - Insurance match
 * - Rating/reviews
 */

import { searchProviders as zocdocSearchProviders } from './client';
import type { ProviderSearchParams, ScoredProvider, ZocdocProvider } from '../types';

interface ScoringWeights {
  specialtyMatch: number;
  distance: number;
  availability: number;
  insuranceMatch: number;
  rating: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  specialtyMatch: 0.3,
  distance: 0.2,
  availability: 0.25,
  insuranceMatch: 0.15,
  rating: 0.1,
};

/**
 * Calculate distance score (closer = higher score)
 */
function scoreDistance(distanceMiles: number | undefined, maxDistance: number = 50): number {
  if (!distanceMiles) return 0.5; // Neutral score if distance unknown
  if (distanceMiles <= 0) return 1.0;
  if (distanceMiles >= maxDistance) return 0.0;
  return 1.0 - (distanceMiles / maxDistance);
}

/**
 * Calculate availability score (sooner = higher score)
 */
function scoreAvailability(nextAvailable: string | undefined): number {
  if (!nextAvailable) return 0.5; // Neutral score if unknown
  
  try {
    const availableDate = new Date(nextAvailable);
    const now = new Date();
    const daysUntil = Math.max(0, Math.floor((availableDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Prefer appointments within 7 days
    if (daysUntil <= 7) return 1.0;
    if (daysUntil <= 14) return 0.8;
    if (daysUntil <= 30) return 0.6;
    return 0.4;
  } catch {
    return 0.5;
  }
}

/**
 * Calculate specialty match score
 */
function scoreSpecialtyMatch(
  providerSpecialties: string[],
  targetSpecialty?: string,
  targetCondition?: string
): number {
  if (!targetSpecialty && !targetCondition) return 0.5; // Neutral if no target
  
  const searchTerms = [
    targetSpecialty?.toLowerCase(),
    targetCondition?.toLowerCase(),
  ].filter(Boolean) as string[];
  
  if (searchTerms.length === 0) return 0.5;
  
  // Check if any provider specialty matches search terms
  const providerSpecialtiesLower = providerSpecialties.map(s => s.toLowerCase());
  
  for (const term of searchTerms) {
    for (const specialty of providerSpecialtiesLower) {
      if (specialty.includes(term) || term.includes(specialty)) {
        return 1.0; // Exact or partial match
      }
    }
  }
  
  return 0.3; // Weak match
}

/**
 * Calculate insurance match score
 */
function scoreInsuranceMatch(
  providerInsurance: string[] | undefined,
  userInsurance?: string
): number {
  if (!userInsurance) return 0.5; // Neutral if no insurance specified
  if (!providerInsurance || providerInsurance.length === 0) return 0.3; // Lower score if unknown
  
  const userInsuranceLower = userInsurance.toLowerCase();
  return providerInsurance.some(ins => 
    ins.toLowerCase().includes(userInsuranceLower) ||
    userInsuranceLower.includes(ins.toLowerCase())
  ) ? 1.0 : 0.0;
}

/**
 * Calculate rating score
 */
function scoreRating(rating: number | undefined, reviewCount: number | undefined): number {
  if (!rating) return 0.5; // Neutral if no rating
  
  // Normalize 0-5 rating to 0-1 score
  const normalizedRating = rating / 5.0;
  
  // Boost score if there are many reviews (more reliable)
  const reviewBoost = reviewCount && reviewCount >= 50 ? 0.1 : 0;
  
  return Math.min(1.0, normalizedRating + reviewBoost);
}

/**
 * Generate match reasons for a provider
 */
function generateMatchReasons(
  provider: ZocdocProvider,
  params: ProviderSearchParams,
  scores: {
    specialty: number;
    distance: number;
    availability: number;
    insurance: number;
    rating: number;
  }
): string[] {
  const reasons: string[] = [];
  
  if (scores.specialty >= 0.8) {
    reasons.push('best match');
  }
  
  if (scores.distance >= 0.8) {
    reasons.push('closest');
  } else if (provider.addresses[0]?.distance && provider.addresses[0].distance <= 5) {
    reasons.push('very close');
  }
  
  if (scores.availability >= 0.8) {
    reasons.push('soonest availability');
  }
  
  if (scores.insurance >= 0.9) {
    reasons.push('accepts your insurance');
  }
  
  if (scores.rating >= 0.8 && provider.review_count && provider.review_count >= 20) {
    reasons.push('highly rated');
  }
  
  return reasons.length > 0 ? reasons : ['available'];
}

/**
 * Search and score providers
 */
export async function searchAndScoreProviders(
  params: ProviderSearchParams,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<ScoredProvider[]> {
  try {
    // Search Zocdoc
    const providers = await zocdocSearchProviders({
      specialty: params.specialty,
      condition: params.condition,
      zip: params.zip,
      city: params.city,
      state: params.state,
      radius: params.radius || 25, // Default 25 miles
      insurance: params.insurance,
      appointment_type: params.appointment_type,
      availability_window: params.availability_window,
    });

    if (providers.length === 0) {
      return [];
    }

    // Score each provider
    const scoredProviders: ScoredProvider[] = providers.map(provider => {
      const distance = provider.addresses[0]?.distance;
      
      const specialtyScore = scoreSpecialtyMatch(
        provider.specialties,
        params.specialty,
        params.condition
      );
      
      const distanceScore = scoreDistance(distance, params.radius || 50);
      
      const availabilityScore = scoreAvailability(provider.next_available);
      
      const insuranceScore = scoreInsuranceMatch(
        provider.accepted_insurance,
        params.insurance
      );
      
      const ratingScore = scoreRating(provider.rating, provider.review_count);
      
      // Weighted total score
      const totalScore = 
        specialtyScore * weights.specialtyMatch +
        distanceScore * weights.distance +
        availabilityScore * weights.availability +
        insuranceScore * weights.insuranceMatch +
        ratingScore * weights.rating;
      
      const matchReasons = generateMatchReasons(provider, params, {
        specialty: specialtyScore,
        distance: distanceScore,
        availability: availabilityScore,
        insurance: insuranceScore,
        rating: ratingScore,
      });
      
      return {
        ...provider,
        score: totalScore,
        match_reasons: matchReasons,
      };
    });

    // Sort by score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);

    // Return top 3
    return scoredProviders.slice(0, 3).map((provider, index) => ({
      ...provider,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('Error searching providers:', error);
    throw error;
  }
}

/**
 * Map specialty keywords to Zocdoc specialty names
 * This helps match user descriptions to actual specialties
 */
export function mapSpecialtyKeyword(keyword: string): string {
  const keywordLower = keyword.toLowerCase();
  
  // Common mappings
  const mappings: Record<string, string> = {
    'skin': 'dermatologist',
    'rash': 'dermatologist',
    'acne': 'dermatologist',
    'dermatologist': 'dermatologist',
    'stomach': 'gastroenterologist',
    'digestive': 'gastroenterologist',
    'stomach pain': 'gastroenterologist',
    'heart': 'cardiologist',
    'chest pain': 'cardiologist',
    'cardiac': 'cardiologist',
    'headache': 'neurologist',
    'migraine': 'neurologist',
    'mental health': 'psychiatrist',
    'depression': 'psychiatrist',
    'anxiety': 'psychiatrist',
    'therapy': 'psychologist',
    'counseling': 'psychologist',
    'back pain': 'orthopedist',
    'joint': 'orthopedist',
    'bone': 'orthopedist',
    'eye': 'ophthalmologist',
    'vision': 'ophthalmologist',
    'ear': 'otolaryngologist',
    'throat': 'otolaryngologist',
    'nose': 'otolaryngologist',
    'women': 'obstetrician',
    'pregnancy': 'obstetrician',
    'gynecologist': 'obstetrician',
  };
  
  for (const [key, specialty] of Object.entries(mappings)) {
    if (keywordLower.includes(key)) {
      return specialty;
    }
  }
  
  // Default: return keyword as-is (Zocdoc may handle it)
  return keyword;
}
