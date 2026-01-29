import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { getEmbedding } from '@/lib/rag/embeddings';
import type { RagQueryResponse } from '@/lib/types';

const RagQuerySchema = z.object({
  agentId: z.string().min(1),
  query: z.string().min(1),
  topK: z.number().int().positive().optional().default(5),
  matchThreshold: z.number().min(0).max(1).optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, query, topK, matchThreshold } = RagQuerySchema.parse(body);

    const queryEmbedding = await getEmbedding(query);

    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc('match_rag_chunks', {
      query_embedding: queryEmbedding,
      filter_agent_id: agentId,
      match_count: topK,
      match_threshold: matchThreshold,
    });

    if (error) {
      throw new Error(`RAG query failed: ${error.message}`);
    }

    const results: RagQueryResponse['results'] = (data ?? []).map(
      (row: {
        id: string;
        rag_doc_id: string;
        content: string;
        metadata: Record<string, unknown> | null;
        similarity: number;
      }) => ({
        id: row.rag_doc_id,
        chunk_id: row.id,
        rag_doc_id: row.rag_doc_id,
        content: row.content,
        metadata: row.metadata ?? undefined,
        score: row.similarity,
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error querying RAG:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to query RAG',
      },
      { status: 500 }
    );
  }
}
