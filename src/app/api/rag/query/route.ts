import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import type { RagQueryResponse } from '@/lib/types';

const RagQuerySchema = z.object({
  agentId: z.string().min(1),
  query: z.string().min(1),
  topK: z.number().int().positive().optional().default(5),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, query, topK } = RagQuerySchema.parse(body);

    const supabase = createServerClient();

    // TODO: Implement vector search with pgvector
    // For now, return placeholder results based on simple text matching
    const { data, error } = await supabase
      .from('rag_docs')
      .select('id, title, content, metadata')
      .eq('agent_id', agentId)
      .limit(topK);

    if (error) {
      throw new Error(`Failed to query RAG documents: ${error.message}`);
    }

    // Return placeholder results (will be replaced with actual vector similarity search)
    const results: RagQueryResponse['results'] = (data || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      metadata: doc.metadata || undefined,
      score: 0.8, // Placeholder score
    }));

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
      { error: 'Failed to query RAG documents' },
      { status: 500 }
    );
  }
}
