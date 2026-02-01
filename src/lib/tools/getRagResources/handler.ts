/**
 * getRagResources: fetch RAG-backed resources for the patient after the call.
 * Uses session transcript, topic, or userMessage to retrieve relevant resources.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { getEmbedding } from '@/lib/rag/embeddings';
import type {
  GetRagResourcesInput,
  GetRagResourcesOutput,
  RagResourceCard,
} from '../types';

const TOPIC_TO_AGENT: Record<string, string> = {
  sleep: 'sleep_insomnia',
  anxiety: 'anxiety_panic',
  relationships: 'relationship_communication',
  general: 'general_reflection',
  depression: 'depression_mood',
  addiction: 'addiction_support',
  focus: 'adhd_executive',
};

const DEFAULT_AGENT = 'general_reflection';
const MAX_RESOURCES = 6;
const MIN_RESOURCES = 3;
const SNIPPET_MAX_LEN = 200;
const TRANSCRIPT_TAKE = 6;
const RAG_TOP_K = 10;

/** Fetch last N transcript turns for session (service role) */
async function getLastUserMessage(
  sessionId: string
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('transcript_turns')
    .select('role, text')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false })
    .limit(TRANSCRIPT_TAKE);

  if (error || !data) return null;

  const userTurns = data.filter((t) => t.role === 'user');
  const last = userTurns[0];
  return last?.text?.trim() || null;
}

/** Resolve agentId from input or topic mapping */
function resolveAgentId(agentId: string | null, topic: string | null): string {
  if (agentId) return agentId;
  if (topic) {
    const normalized = topic.toLowerCase().trim();
    return TOPIC_TO_AGENT[normalized] ?? DEFAULT_AGENT;
  }
  return DEFAULT_AGENT;
}

/** Resolve retrieval query from input or transcript */
async function resolveQuery(
  sessionId: string,
  userMessage: string | null,
  topic: string | null
): Promise<string> {
  if (userMessage?.trim()) return userMessage.trim();
  if (topic?.trim()) return topic.trim();
  const last = await getLastUserMessage(sessionId);
  if (last) return last;
  return 'support and resources';
}

interface RagChunkRow {
  id: string;
  rag_doc_id: string;
  agent_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

function truncateSnippet(text: string, maxLen: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 3) + '...';
}

export async function handleGetRagResources(
  input: GetRagResourcesInput
): Promise<GetRagResourcesOutput> {
  const agentId = resolveAgentId(input.agentId, input.topic);
  const query = await resolveQuery(input.sessionId, input.userMessage, input.topic);

  const embedding = await getEmbedding(query);

  const supabase = createServiceRoleClient();
  const { data: chunks, error } = await supabase.rpc('match_rag_chunks', {
    query_embedding: embedding,
    filter_agent_id: agentId,
    match_count: RAG_TOP_K,
    match_threshold: 0,
  });

  if (error) {
    throw new Error(`RAG query failed: ${error.message}`);
  }

  const rows = (chunks ?? []) as RagChunkRow[];

  const seen = new Set<string>();
  const resources: RagResourceCard[] = [];

  for (const row of rows) {
    const meta = row.metadata ?? {};
    const title = (meta.title as string) || (meta.resource_title as string) || 'Resource';
    const type = (meta.type as string) || 'article';
    const url = (meta.url as string) || null;

    const dedupeKey = (title || url || row.rag_doc_id).toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const snippet = truncateSnippet(row.content, SNIPPET_MAX_LEN);
    const why =
      row.similarity >= 0.7
        ? 'Highly relevant to what you discussed.'
        : 'Relevant to your conversation.';

    resources.push({
      title,
      type,
      url,
      snippet,
      why,
    });

    if (resources.length >= MAX_RESOURCES) break;
  }

  const resultCount = Math.max(
    MIN_RESOURCES,
    Math.min(MAX_RESOURCES, resources.length)
  );

  return {
    resources: resources.slice(0, resultCount),
  };
}
