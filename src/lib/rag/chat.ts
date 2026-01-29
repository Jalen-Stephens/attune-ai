/**
 * RAG chat: build retrieval query, compose prompt, call LLM with structured JSON output.
 */

import type { ChatStructuredResponse } from '@/lib/types';

const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';
const MAX_LAST_TURNS = 10;
const RETRIEVAL_TOP_K = 5;

export interface ChatContextInput {
  sessionSummary?: string | null;
  summaryJson?: { topics?: string[]; emotional_themes?: string[] } | null;
  lastTurns: Array<{ role: 'user' | 'assistant'; text: string }>;
  currentUserMessage: string;
}

export interface RetrievedChunk {
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

/** Compact agent info for the LLM to suggest voice agents */
export interface AvailableAgentForPrompt {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  recommendedFor?: string[];
}

export interface ChatPromptInput {
  systemPrompt: string;
  context: ChatContextInput;
  retrievedChunks: RetrievedChunk[];
  disclaimer: string;
  crisisDetected?: boolean;
  crisisMessage?: string;
  /** Voice agents the user can be suggested (for suggested_agents); exclude current session agent */
  availableAgents?: AvailableAgentForPrompt[];
  /** Current session agent id — suggest *other* agents that fit the user's situation */
  currentAgentId?: string;
}

const STRUCTURED_RESPONSE_SCHEMA = `You must respond with valid JSON only, no markdown or extra text. Schema:
{
  "message": "string (brief, conversational reply: 1-4 sentences; directly address what the user said; do not lecture or dump long text)",
  "resources": [{"id": "string", "title": "string", "snippet": "string", "url": "string | null", "type": "string", "reason": "string"}],
  "suggested_agents": [{"agent_id": "string (must match an available voice agent id)", "name": "string", "reason": "string (1 sentence: why this agent fits what the user shared)", "confidence": number 0-1}]
}`;

function buildRetrievalQuery(context: ChatContextInput): string {
  const parts: string[] = [];
  if (context.sessionSummary) {
    parts.push(context.sessionSummary);
  }
  if (context.summaryJson?.topics?.length) {
    parts.push('Topics: ' + context.summaryJson.topics.join(', '));
  }
  const recent = context.lastTurns.slice(-6).map((t) => t.text);
  parts.push(recent.join(' '));
  parts.push(context.currentUserMessage);
  return parts.join('\n\n').slice(0, 2000);
}

export function buildRetrievalQueryFromContext(context: ChatContextInput): string {
  return buildRetrievalQuery(context);
}

export function buildSystemPrompt(input: ChatPromptInput): string {
  const { systemPrompt, disclaimer, crisisDetected, crisisMessage, availableAgents, currentAgentId } = input;
  let system = systemPrompt + '\n\n' + disclaimer;
  system +=
    '\n\nKeep your reply brief and conversational (typically 1-4 sentences). Directly address what the user said; do not lecture or dump long blocks of text. Use retrieved context only to briefly support your reply.';

  if (availableAgents && availableAgents.length > 0) {
    system +=
      '\n\n**Suggest both an agent and a resource when relevant**: In each reply, when the user\'s situation fits, include (1) at least one voice agent in suggested_agents — someone they can talk to — and (2) at least one resource in resources — something to read or try (from retrieved context or a short tip). Match the agent to their situation (e.g. anxiety → Anxiety agent). Use suggested_agents early and often; only use agent_id from the list in the user message; give a short, tailored reason for each. Do not suggest the current agent (current agent id: ' +
      (currentAgentId || 'none') +
      ').';
  }

  if (crisisDetected && crisisMessage) {
    system +=
      '\n\nIf the user has expressed a crisis (e.g. self-harm, suicide), respond with empathy and include the following safety message. Do not ignore it: ' +
      crisisMessage;
  }
  system += '\n\n' + STRUCTURED_RESPONSE_SCHEMA;
  return system;
}

export function buildUserPrompt(input: ChatPromptInput): string {
  const { context, retrievedChunks, crisisDetected, availableAgents, currentAgentId } = input;
  const lines: string[] = [];

  if (availableAgents && availableAgents.length > 0) {
    lines.push('## Available voice agents (suggest 1–3 when they fit the user\'s situation; use these ids in suggested_agents)');
    availableAgents.forEach((a) => {
      const extras: string[] = [];
      if (a.tags?.length) extras.push('tags: ' + a.tags.slice(0, 5).join(', '));
      if (a.recommendedFor?.length) extras.push('good for: ' + a.recommendedFor.slice(0, 3).join('; '));
      const extra = extras.length ? ' | ' + extras.join(' | ') : '';
      lines.push(`- id: "${a.id}" | name: ${a.name} | ${a.description}${extra}`);
    });
    if (currentAgentId) {
      lines.push(`(Current agent for this chat: ${currentAgentId} — suggest *other* agents that fit.)`);
    }
    lines.push('');
  }

  if (retrievedChunks.length > 0) {
    lines.push('## Retrieved context (use briefly to support your reply; do not repeat long passages)');
    retrievedChunks.forEach((chunk, i) => {
      lines.push(`[${i + 1}] ${chunk.content}`);
    });
    lines.push('');
  }

  lines.push('## Recent conversation');
  context.lastTurns.forEach((t) => {
    lines.push(`${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`);
  });
  lines.push(`User: ${context.currentUserMessage}`);
  lines.push('');
  lines.push(
    crisisDetected
      ? 'The user may be in crisis. Include the safety message and suggest 988 / professional help. Still respond with valid JSON.'
      : 'Reply briefly and directly to the user. When relevant, include at least one suggested_agent (voice agent they can talk to) and at least one resource (something to read or try). Respond with valid JSON only (message, resources, suggested_agents).'
  );

  return lines.join('\n');
}

export async function callChatStructured(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_CHAT_MODEL
): Promise<ChatStructuredResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI chat failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI chat: empty response');
  }

  const parsed = JSON.parse(content) as ChatStructuredResponse;
  if (!parsed.message || !Array.isArray(parsed.resources)) {
    parsed.resources = [];
  }
  if (!Array.isArray(parsed.suggested_agents)) {
    parsed.suggested_agents = [];
  }
  return parsed;
}

export { MAX_LAST_TURNS, RETRIEVAL_TOP_K };
