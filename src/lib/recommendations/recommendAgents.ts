import { getAgents } from '@/lib/agents';
import type { AgentProfile } from '@/lib/types';

export interface SuggestedAgent {
  slug: string;
  name: string;
  reason: string;
  tags: string[];
}

/** Tokenize query into lowercase words for matching */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Build searchable text from agent: name, description, category, tags, recommendedFor */
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
 * Score agents by overlap between query tokens and agent metadata.
 * Returns top 5 with a short reason.
 */
export async function recommendAgents(query: string, topK = 5): Promise<SuggestedAgent[]> {
  const agents = await getAgents();
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return agents.slice(0, topK).map((a) => ({
      slug: a.id,
      name: a.name,
      reason: 'Relevant to general support.',
      tags: a.tags ?? [],
    }));
  }

  const scored = agents.map((agent) => {
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

    return { agent, score, matched };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  return top.map(({ agent, matched }) => ({
    slug: agent.id,
    name: agent.name,
    reason:
      matched.length > 0
        ? `Matches what you shared (e.g. ${matched.slice(0, 3).join(', ')}).`
        : 'May be a good fit for next steps.',
    tags: agent.tags ?? [],
  }));
}
