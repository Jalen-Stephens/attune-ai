/**
 * Harvest ingest wrapper: build metadata (source_url, brave_result, content_hash, etc.) and call ingestDocument.
 */

import { ingestDocument, type IngestResult } from '@/lib/rag/ingest';

export type HarvestIngestInput = {
  agentId: string;
  title: string;
  content: string;
  sourceUrl: string;
  retrievedAt: string;
  contentType: 'pdf' | 'article';
  domain: string;
  queryUsed?: string;
  agentSlug: string;
  contentHash: string;
  licenseHint?: string;
  /** Full Brave API result object for this result (Pro enriched data). */
  braveResult?: Record<string, unknown>;
};

/**
 * Ingest a harvested document with full metadata and brave_result blob.
 */
export async function ingestHarvestDocument(input: HarvestIngestInput): Promise<IngestResult> {
  const metadata: Record<string, unknown> = {
    source_url: input.sourceUrl,
    retrieved_at: input.retrievedAt,
    content_type: input.contentType,
    domain: input.domain,
    query_used: input.queryUsed ?? null,
    agent_slug: input.agentSlug,
    content_hash: input.contentHash,
  };
  if (input.licenseHint !== undefined && input.licenseHint !== '') {
    metadata.license_hint = input.licenseHint;
  }
  if (input.braveResult !== undefined && input.braveResult !== null) {
    metadata.brave_result = input.braveResult;
  }

  return ingestDocument({
    agentId: input.agentId,
    title: input.title,
    content: input.content,
    metadata,
  });
}
