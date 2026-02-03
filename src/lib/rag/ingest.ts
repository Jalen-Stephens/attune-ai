/**
 * Shared RAG ingestion pipeline: insert doc, chunk, embed, insert chunks.
 * Uses service role client for server-only admin operations.
 */

import { createServiceRoleClient } from '@/utils/supabase/admin';
import { splitIntoChunks } from '@/lib/rag/chunk';
import { getEmbeddings, EMBEDDING_DIMENSIONS } from '@/lib/rag/embeddings';

export type IngestInput = {
  agentId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type IngestResult = {
  ragDocId: string;
  chunksInserted: number;
};

/** Chunk metadata shape for rag_doc_chunks.metadata */
export type ChunkMetadata = {
  title?: string;
  resource_type?: string;
  tags?: string[];
  topic?: string;
  chunk_start?: number;
  chunk_end?: number;
  [key: string]: unknown;
};

/**
 * Ingest a single document: insert into rag_docs, chunk content, embed chunks, insert into rag_doc_chunks.
 * Uses 200–800 token chunks (target 450, overlap 80). Validates embedding dimensions (1536).
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const { agentId, title, content, metadata } = input;
  const docMeta = (metadata ?? {}) as ChunkMetadata;

  const chunks = splitIntoChunks(content);
  if (chunks.length === 0) {
    throw new Error('No chunks produced from content');
  }

  const supabase = createServiceRoleClient();

  const { data: ragDoc, error: docError } = await supabase
    .from('rag_docs')
    .insert({
      agent_id: agentId,
      title,
      content,
      metadata: docMeta,
      embedding: null,
    })
    .select('id')
    .single();

  if (docError) {
    throw new Error(`Failed to insert rag_doc: ${docError.message}`);
  }

  const ragDocId = ragDoc.id;
  const chunkContents = chunks.map((c) => c.content);
  const embeddings = await getEmbeddings(chunkContents);

  if (embeddings.length !== chunks.length) {
    await supabase.from('rag_docs').delete().eq('id', ragDocId);
    throw new Error(
      `Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`
    );
  }

  for (let i = 0; i < embeddings.length; i++) {
    if (embeddings[i].length !== EMBEDDING_DIMENSIONS) {
      await supabase.from('rag_docs').delete().eq('id', ragDocId);
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embeddings[i].length} (chunk ${i + 1})`
      );
    }
  }

  const chunkRows = chunks.map((chunk, i) => ({
    rag_doc_id: ragDocId,
    agent_id: agentId,
    chunk_index: chunk.chunk_index,
    content: chunk.content,
    embedding: embeddings[i] as number[],
    metadata: {
      ...docMeta,
      title,
      chunk_start: chunk.start_char,
      chunk_end: chunk.end_char,
    } as ChunkMetadata,
  }));

  const { error: chunksError } = await supabase
    .from('rag_doc_chunks')
    .insert(chunkRows);

  if (chunksError) {
    await supabase.from('rag_docs').delete().eq('id', ragDocId);
    throw new Error(`Failed to insert rag_doc_chunks: ${chunksError.message}`);
  }

  return {
    ragDocId,
    chunksInserted: chunks.length,
  };
}
