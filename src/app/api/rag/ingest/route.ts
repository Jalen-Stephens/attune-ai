import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const RagIngestSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, title, content, metadata } = RagIngestSchema.parse(body);

    const supabase = createServerClient();

    // Insert document into rag_docs table
    // Note: embedding is left as NULL for now (will be populated when pgvector is enabled)
    const { data, error } = await supabase
      .from('rag_docs')
      .insert({
        agent_id: agentId,
        title,
        content,
        metadata: metadata || null,
        embedding: null, // Placeholder - will be vector when pgvector is enabled
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to ingest document: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      id: data.id,
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
      { error: 'Failed to ingest document' },
      { status: 500 }
    );
  }
}
