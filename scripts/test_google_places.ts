#!/usr/bin/env node
/**
 * Test Google Places therapist search locally.
 * Usage: npx tsx scripts/test_google_places.ts [--zip 94102] [--specialty anxiety]
 *
 * Requires in .env.local (or .env): GOOGLE_PLACES_API_KEY
 * Optional: GOOGLE_GEOCODING_API_KEY (defaults to GOOGLE_PLACES_API_KEY)
 *
 * Enable Places API (New) and Geocoding API in Google Cloud Console.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env before any module that reads process.env (e.g. Google client)
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function parseArgs(): { zip: string; specialty?: string } {
  const args = process.argv.slice(2);
  let zip = '94102';
  let specialty: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--zip' && args[i + 1]) {
      zip = args[++i];
    } else if (args[i] === '--specialty' && args[i + 1]) {
      specialty = args[++i];
    }
  }
  return { zip, specialty };
}

async function main() {
  const { zip, specialty } = parseArgs();

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('Missing GOOGLE_PLACES_API_KEY. Set it in .env.local and enable Places API (New) and Geocoding API in Google Cloud.');
    process.exit(1);
  }

  const { searchTherapists } = await import('../src/lib/google-places/searchTherapists');

  console.log('Searching for therapists:', { zip, specialty: specialty ?? 'therapy' });

  try {
    const providers = await searchTherapists({
      zip,
      radiusMeters: 25 * 1609.34,
      specialtyKeyword: specialty ?? 'therapy',
    });

    console.log(`\nFound ${providers.length} result(s):\n`);
    providers.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      if (p.formattedAddress) console.log(`   ${p.formattedAddress}`);
      if (p.rating != null) console.log(`   Rating: ${p.rating}${p.userRatingCount != null ? ` (${p.userRatingCount} reviews)` : ''}`);
      if (p.distanceMiles != null) console.log(`   ~${p.distanceMiles.toFixed(1)} mi`);
      if (p.matchReasons.length) console.log(`   Match: ${p.matchReasons.join(', ')}`);
      if (p.websiteUri) console.log(`   Web: ${p.websiteUri}`);
      if (p.googleMapsUri) console.log(`   Maps: ${p.googleMapsUri}`);
      console.log('');
    });
  } catch (err) {
    console.error('Search failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
