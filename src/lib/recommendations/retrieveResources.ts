import { RESOURCES, type ResourceItem } from '@/lib/resources';

export interface SuggestedResource {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  url?: string;
  reason: string;
  type: string;
}

/** Tokenize for keyword matching */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Score resources by keyword overlap with query.
 * TODO: Replace with vector/RAG search when available.
 */
export function retrieveResources(query: string, topK = 5): SuggestedResource[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return RESOURCES.slice(0, topK).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      reason: 'May be helpful.',
      type: r.type,
    }));
  }

  const scored = RESOURCES.map((resource) => {
    const searchText = [resource.title, resource.snippet, resource.keywords.join(' ')].join(' ').toLowerCase();
    let score = 0;
    const matched: string[] = [];

    for (const token of tokens) {
      if (resource.keywords.some((k) => k.toLowerCase().includes(token) || token.length >= 3 && k.toLowerCase().includes(token))) {
        score += 2;
        if (!matched.includes(token)) matched.push(token);
      }
      if (searchText.includes(token)) {
        score += 1;
      }
    }

    return { resource, score, matched };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  return top.map(({ resource, matched }) => ({
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    snippet: resource.snippet,
    url: resource.url,
    reason: matched.length > 0 ? `Relevant to: ${matched.slice(0, 3).join(', ')}.` : 'May be useful.',
    type: resource.type,
  }));
}
