/**
 * Content hash (sha256 of normalized text) and "already ingested" check.
 */

import { createHash } from 'crypto';
import { createServiceRoleClient } from '@/utils/supabase/admin';

function normalizeForHash(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SHA256 hash of normalized text (trim + collapse whitespace).
 */
export function contentHash(text: string): string {
  const normalized = normalizeForHash(text);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Check if a doc with this content_hash already exists for this agent.
 */
export async function isAlreadyIngested(agentId: string, hash: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('rag_docs')
    .select('id')
    .eq('agent_id', agentId)
    .eq('metadata->>content_hash', hash)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check duplicate: ${error.message}`);
  }
  return data != null;
}
