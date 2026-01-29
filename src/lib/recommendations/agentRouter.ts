/**
 * Agent routing: suggest which agent fits the user's message/session.
 * Returns agent_id, reason, confidence (0-1).
 * Use for: pre-chat routing, "suggest agent" UI, or validating LLM-suggested agents.
 */

import { getAgents } from '@/lib/agents';
import type { AgentProfile } from '@/lib/types';

export interface RouterSuggestion {
  agent_id: string;
  name: string;
  reason: string;
  confidence: number;
}

const MAX_SCORE = 20;
const SUGGEST_SWITCH_CURRENT_THRESHOLD = 0.6;
const SUGGEST_SWITCH_OTHER_MIN_CONFIDENCE = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function agentSearchText(agent: AgentProfile): string {
  const parts = [
    agent.name,
    agent.description,
    agent.specialtyCategory ?? '',
    (agent.tags ?? []).join(' '),
    (agent.recommendedFor ?? []).join(' '),
  ];
  return parts.join(' ').toLowerCase();
}

/**
 * Score one agent against query (0 to ~MAX_SCORE). Higher = better fit.
 */
function scoreAgent(agent: AgentProfile, tokens: string[]): { score: number; matched: string[] } {
  const text = agentSearchText(agent);
  let score = 0;
  const matched: string[] = [];

  for (const token of tokens) {
    if (text.includes(token)) {
      score += 1;
      if (!matched.includes(token)) matched.push(token);
    }
    if ((agent.tags ?? []).some((t) => t.toLowerCase().includes(token))) {
      score += 2;
    }
    if (agent.specialtyCategory?.toLowerCase().includes(token)) {
      score += 2;
    }
  }
  return { score, matched };
}

/**
 * Normalize raw score to confidence 0-1 (saturates around MAX_SCORE).
 */
function scoreToConfidence(score: number): number {
  if (score <= 0) return 0;
  return Math.min(1, score / MAX_SCORE);
}

/**
 * Route query to suggested agents with confidence. Uses keyword overlap.
 */
export async function routeAgents(
  query: string,
  topK = 5
): Promise<RouterSuggestion[]> {
  const agents = await getAgents();
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return agents.slice(0, topK).map((a) => ({
      agent_id: a.id,
      name: a.name,
      reason: 'Relevant to general support.',
      confidence: 0.5,
    }));
  }

  const scored = agents.map((agent) => {
    const { score, matched } = scoreAgent(agent, tokens);
    return { agent, score, matched };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  return top.map(({ agent, score, matched }) => ({
    agent_id: agent.id,
    name: agent.name,
    reason:
      matched.length > 0
        ? `Matches: ${matched.slice(0, 3).join(', ')}.`
        : 'May be a good fit.',
    confidence: scoreToConfidence(score),
  }));
}

/**
 * Decide whether to suggest switching from currentAgentId to another agent.
 * Conditions: current agent confidence below threshold AND another agent above min confidence.
 */
export function shouldSuggestAgentSwitch(
  currentAgentId: string,
  suggestions: RouterSuggestion[],
  currentConfidence?: number
): { suggest: boolean; best?: RouterSuggestion } {
  const current = suggestions.find((s) => s.agent_id === currentAgentId);
  const currentConf = currentConfidence ?? current?.confidence ?? 1;
  const others = suggestions.filter((s) => s.agent_id !== currentAgentId);
  const bestOther = others[0];

  const suggest =
    currentConf < SUGGEST_SWITCH_CURRENT_THRESHOLD &&
    (bestOther?.confidence ?? 0) >= SUGGEST_SWITCH_OTHER_MIN_CONFIDENCE;

  return { suggest, best: suggest ? bestOther : undefined };
}
