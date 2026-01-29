import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { splitIntoChunks } from '@/lib/rag/chunking';
import { getEmbeddings, EMBEDDING_DIMENSIONS } from '@/lib/rag/embeddings';

const RagIngestSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

/** Metadata on each chunk: source title, resource type, tags, topic */
export type ChunkMetadata = {
  title?: string;
  resource_type?: 'article' | 'handout' | 'exercise' | 'guide';
  tags?: string[];
  topic?: string;
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, title, content, metadata } = RagIngestSchema.parse(body);

    const docMeta = (metadata ?? {}) as ChunkMetadata;
    const chunks = splitIntoChunks(content);
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No chunks produced from content' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

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
      throw new Error(
        `Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`
      );
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

    return NextResponse.json({
      success: true,
      id: ragDocId,
      chunks: chunks.length,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error ingesting RAG document:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to ingest document',
      },
      { status: 500 }
    );
  }
}
