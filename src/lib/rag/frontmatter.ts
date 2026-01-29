/**
 * Parse YAML frontmatter from markdown source.
 * Handles: title, type, tags, url (optional), agent_id.
 * Does not require a YAML library; parses common patterns.
 */

export type ResourceType = 'exercise' | 'worksheet' | 'guide' | 'article';

export interface ParsedFrontmatter {
  title: string;
  type: ResourceType;
  tags: string[];
  url?: string;
  agent_id: string;
  /** Any other keys from frontmatter (e.g. for metadata) */
  [key: string]: unknown;
}

const FRONTMATTER_DELIM = '---';

/**
 * Extract raw frontmatter string (between first --- and second ---).
 */
function extractRawFrontmatter(source: string): { frontmatter: string; body: string } | null {
  const start = source.indexOf(FRONTMATTER_DELIM);
  if (start !== 0) return null;
  const afterFirst = source.slice(FRONTMATTER_DELIM.length);
  const end = afterFirst.indexOf(FRONTMATTER_DELIM);
  if (end === -1) return null;
  const frontmatter = afterFirst.slice(0, end).trim();
  const body = afterFirst.slice(end + FRONTMATTER_DELIM.length).trim();
  return { frontmatter, body };
}

/**
 * Parse tags from a line like "tags: [a, b, c]" or "tags:\n  - a\n  - b".
 */
function parseTags(value: string, lines: string[], lineIndex: number): string[] {
  const arrayMatch = value.match(/^\s*\[(.*)\]\s*$/);
  if (arrayMatch) {
    const inner = arrayMatch[1];
    if (!inner.trim()) return [];
    return inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  }
  if (value.trim() === '' && lines[lineIndex + 1]?.match(/^\s*-\s+/)) {
    const collected: string[] = [];
    let i = lineIndex + 1;
    while (lines[i]?.match(/^\s*-\s+/)) {
      collected.push(lines[i].replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      i++;
    }
    return collected;
  }
  return [];
}

/**
 * Parse frontmatter key-value and simple arrays.
 */
export function parseFrontmatter(source: string): { frontmatter: ParsedFrontmatter; body: string } | null {
  const extracted = extractRawFrontmatter(source);
  if (!extracted) return null;

  const { frontmatter: raw, body } = extracted;
  const lines = raw.split('\n');
  const result: Record<string, unknown> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'tags') {
      const tags = parseTags(value, lines, i);
      result.tags = tags;
      continue;
    }
    if (key === 'title' || key === 'type' || key === 'url' || key === 'agent_id') {
      result[key] = value.replace(/^["']|["']$/g, '');
      continue;
    }
    result[key] = value.replace(/^["']|["']$/g, '');
  }

  const title = result.title as string | undefined;
  const type = result.type as string | undefined;
  const agent_id = result.agent_id as string | undefined;

  if (!title || !agent_id) {
    return null;
  }

  const allowedTypes: ResourceType[] = ['exercise', 'worksheet', 'guide', 'article'];
  const resolvedType: ResourceType = allowedTypes.includes(type as ResourceType)
    ? (type as ResourceType)
    : 'article';

  const parsed: ParsedFrontmatter = {
    title,
    type: resolvedType,
    tags: (result.tags as string[]) ?? [],
    agent_id,
    ...(result.url ? { url: result.url as string } : {}),
    ...result,
  };

  return { frontmatter: parsed, body };
}
