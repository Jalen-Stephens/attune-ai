import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { getSessionDetail } from '@/lib/db';
import { getAgentById, getAgents } from '@/lib/agents';
import { getEmbedding } from '@/lib/rag/embeddings';
import {
  buildRetrievalQueryFromContext,
  buildSystemPrompt,
  buildUserPrompt,
  callChatStructured,
  MAX_LAST_TURNS,
  RETRIEVAL_TOP_K,
} from '@/lib/rag/chat';
import { checkCrisis } from '@/lib/recommendations/crisisDetection';
import { routeAgents } from '@/lib/recommendations/agentRouter';
import type {
  ChatApiResponse,
  ResourceCard,
  AgentCard,
  SessionState,
} from '@/lib/types';

const ChatBodySchema = z.object({
  message: z.string().min(1).max(16000),
});

const BASE_DISCLAIMER =
  'You are a supportive AI. Do not diagnose or provide medical/clinical advice. Encourage professional help when appropriate. Respond only with valid JSON.';

/** Min confidence (0–1) to use the router's top agent for retrieval instead of session agent */
const ROUTE_RETRIEVAL_MIN_CONFIDENCE = 0.15;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { message: userMessage } = ChatBodySchema.parse(body);

    const supabase = await createServerClient();
    const { session, transcript, summary } = await getSessionDetail(sessionId);
    // Resolve agent from DB join or in-memory list (DB join can be null if agent_profiles has RLS)
    const agent = session.agent ?? (session.agent_id ? await getAgentById(session.agent_id) : null);
    if (!agent?.id || !agent.system_prompt) {
      return NextResponse.json(
        { error: 'Session or agent not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { data: userTurn, error: userTurnError } = await supabase
      .from('transcript_turns')
      .insert({
        session_id: sessionId,
        role: 'user',
        text: userMessage,
        timestamp: now,
      })
      .select('id')
      .single();

    if (userTurnError) {
      throw new Error(`Failed to save user turn: ${userTurnError.message}`);
    }

    const crisis = checkCrisis(userMessage);
    const riskFlags: string[] = [...(session.state?.risk_flags ?? [])];
    if (crisis.isCrisis) {
      riskFlags.push('crisis_mentioned');
    }

    const lastTurns = transcript
      .slice(-MAX_LAST_TURNS)
      .map((t) => ({ role: t.role as 'user' | 'assistant', text: t.text }));
    lastTurns.push({ role: 'user', text: userMessage });

    const context = {
      sessionSummary: summary?.summary_text ?? null,
      summaryJson: summary?.summary_json ?? null,
      lastTurns: transcript
        .slice(-MAX_LAST_TURNS)
        .map((t) => ({ role: t.role as 'user' | 'assistant', text: t.text })),
      currentUserMessage: userMessage,
    };

    const retrievalQuery = buildRetrievalQueryFromContext(context);
    const queryEmbedding = await getEmbedding(retrievalQuery);

    // Topic-based routing: first message always uses best-fit agent; later messages use router when confidence is high
    const isFirstMessage = transcript.length === 0;
    const routerSuggestions = await routeAgents(userMessage, 3);
    const topRouted = routerSuggestions[0];
    const useRoutedAgent = isFirstMessage
      ? !!topRouted
      : !!(
          topRouted &&
          topRouted.confidence >= ROUTE_RETRIEVAL_MIN_CONFIDENCE &&
          topRouted.agent_id !== agent.id
        );
    const retrievalAgentId = useRoutedAgent && topRouted ? topRouted.agent_id : agent.id;
    const effectiveAgent =
      retrievalAgentId === agent.id ? agent : (await getAgentById(retrievalAgentId)) ?? agent;

    const { data: chunksData, error: rpcError } = await supabase.rpc(
      'match_rag_chunks',
      {
        query_embedding: queryEmbedding,
        filter_agent_id: effectiveAgent.id,
        match_count: RETRIEVAL_TOP_K,
        match_threshold: 0,
      }
    );

    type RetrievedChunk = {
      content: string;
      score: number;
      metadata: Record<string, unknown> | undefined;
      chunk_id: string;
      rag_doc_id: string;
    };

    const retrievedChunks: RetrievedChunk[] = (rpcError ? [] : (chunksData ?? [])).map(
      (row: {
        id: string;
        rag_doc_id: string;
        content: string;
        metadata: Record<string, unknown> | null;
        similarity: number;
      }) => ({
        content: row.content,
        score: row.similarity,
        metadata: row.metadata ?? undefined,
        chunk_id: row.id,
        rag_doc_id: row.rag_doc_id,
      })
    );

    // Log RAG retrieval for DB mapping: effective (routed) agent + doc/chunk IDs
    const ragDocIds = [...new Set(retrievedChunks.map((c) => c.rag_doc_id))];
    const chunkIds = retrievedChunks.map((c) => ({ chunk_id: c.chunk_id, rag_doc_id: c.rag_doc_id, score: c.score }));
    console.log('[RAG Chat] retrieval', {
      session_id: sessionId,
      session_agent_id: agent.id,
      effective_agent_id: effectiveAgent.id,
      effective_agent_name: effectiveAgent.name,
      first_message: isFirstMessage,
      routed: useRoutedAgent,
      rag_doc_ids: ragDocIds,
      chunk_ids: chunkIds,
    });

    const allAgents = await getAgents();
    const availableAgentsForPrompt = allAgents
      .filter((a) => a.id !== effectiveAgent.id)
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        tags: a.tags,
        recommendedFor: a.recommendedFor,
      }));

    const promptInput = {
      systemPrompt: effectiveAgent.system_prompt,
      context: {
        ...context,
        lastTurns: context.lastTurns,
      },
      retrievedChunks: retrievedChunks.map(
        (c: {
          content: string;
          score: number;
          metadata?: Record<string, unknown>;
        }) => ({
          content: c.content,
          score: c.score,
          metadata: c.metadata,
        })
      ),
      disclaimer: BASE_DISCLAIMER,
      crisisDetected: crisis.isCrisis,
      crisisMessage: crisis.isCrisis ? crisis.message : undefined,
      availableAgents: availableAgentsForPrompt,
      currentAgentId: effectiveAgent.id,
    };

    const systemPrompt = buildSystemPrompt(promptInput);
    const userPrompt = buildUserPrompt(promptInput);

    const structured = await callChatStructured(
      systemPrompt,
      userPrompt,
      process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini'
    );

    const { data: assistantTurn, error: assistantTurnError } = await supabase
      .from('transcript_turns')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        text: structured.message,
        timestamp: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (assistantTurnError) {
      throw new Error(`Failed to save assistant turn: ${assistantTurnError.message}`);
    }

    const assistantTurnId = assistantTurn.id;

    await supabase.from('rag_retrievals').insert({
      session_id: sessionId,
      assistant_turn_id: assistantTurnId,
      query: retrievalQuery,
      retrieved_chunks: retrievedChunks.map(
        (c: {
          content: string;
          score: number;
          chunk_id: string;
          rag_doc_id: string;
        }) => ({
          chunk_id: c.chunk_id,
          rag_doc_id: c.rag_doc_id,
          score: c.score ?? 0,
          content_preview: (c.content ?? '').slice(0, 200),
        })
      ),
    });

    const MAX_RESOURCES = 2;
    const resources: ResourceCard[] = (structured.resources ?? [])
      .slice(0, MAX_RESOURCES)
      .map((r) => ({
        id: r.id ?? `res-${Math.random().toString(36).slice(2, 9)}`,
        title: r.title ?? '',
        snippet: r.snippet ?? '',
        url: r.url ?? undefined,
        type: r.type ?? 'guide',
        reason: r.reason ?? 'Suggested from conversation.',
      }));

    // Log response summary for DB mapping: turn + effective agent + RAG docs + resource titles
    console.log('[RAG Chat] response', {
      session_id: sessionId,
      assistant_turn_id: assistantTurnId,
      effective_agent_id: effectiveAgent.id,
      rag_doc_ids: ragDocIds,
      resource_titles: resources.map((r) => r.title),
      suggested_agent_ids: (structured.suggested_agents ?? []).map((a) => a.agent_id),
    });

    const suggestedAgents: AgentCard[] = (
      structured.suggested_agents ?? []
    ).map((a) => ({
      agent_id: a.agent_id ?? '',
      name: a.name ?? '',
      reason: a.reason ?? '',
      confidence: typeof a.confidence === 'number' ? a.confidence : 0.5,
    }));

    const suggestionRows: Array<{
      session_id: string;
      turn_id: string;
      kind: 'resource' | 'agent';
      payload: Record<string, unknown>;
      shown: boolean;
      clicked: boolean;
    }> = [];

    resources.forEach((r) => {
      suggestionRows.push({
        session_id: sessionId,
        turn_id: assistantTurnId,
        kind: 'resource',
        payload: {
          id: r.id,
          title: r.title,
          snippet: r.snippet,
          url: r.url,
          type: r.type,
          reason: r.reason,
        },
        shown: false,
        clicked: false,
      });
    });

    suggestedAgents.forEach((a) => {
      suggestionRows.push({
        session_id: sessionId,
        turn_id: assistantTurnId,
        kind: 'agent',
        payload: {
          agent_id: a.agent_id,
          name: a.name,
          reason: a.reason,
          confidence: a.confidence,
        },
        shown: false,
        clicked: false,
      });
    });

    if (suggestionRows.length > 0) {
      await supabase.from('suggestions').insert(suggestionRows);
    }

    const topAgentConfidence =
      suggestedAgents.length > 0 ? suggestedAgents[0].confidence : undefined;
    const newState: SessionState = {
      ...session.state,
      current_topic: userMessage.slice(0, 200),
      risk_flags: riskFlags.length > 0 ? riskFlags : undefined,
      active_agent: effectiveAgent.id,
      last_router_confidence: topAgentConfidence,
    };

    // On first message, adopt the effective (routed) agent so the session continues with that agent
    const sessionUpdate: { state: SessionState; agent_id?: string } = { state: newState };
    if (isFirstMessage && effectiveAgent.id !== agent.id) {
      sessionUpdate.agent_id = effectiveAgent.id;
    }
    await supabase.from('sessions').update(sessionUpdate).eq('id', sessionId);

    const response: ChatApiResponse = {
      turnId: assistantTurnId,
      message: structured.message,
      resources,
      suggestedAgents,
      retrievalLogged: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Chat request failed',
      },
      { status: 500 }
    );
  }
}
