/**
 * Service-role Supabase client for server-side admin operations (e.g. RAG ingest, CLI).
 * No Next.js imports—safe to use from Node CLI scripts.
 */

import { createClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for createServiceRoleClient'
    );
  }
  return createClient(url, serviceRoleKey);
}
