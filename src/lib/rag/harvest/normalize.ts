/**
 * Build markdown with YAML frontmatter (source_url, retrieved_at, domain, etc.) and clean body.
 */

export type NormalizeInput = {
  title: string;
  body: string;
  sourceUrl: string;
  retrievedAt: string;
  domain: string;
  contentType: 'pdf' | 'article';
  agentSlug: string;
  queryUsed?: string;
  licenseHint?: string;
  tags?: string[];
};

function escapeYamlString(s: string): string {
  if (s.includes('\n') || s.includes(':') || s.includes('"') || s.includes("'")) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }
  return s;
}

function cleanBody(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Build markdown with frontmatter and cleaned body.
 */
export function normalizeToMarkdown(input: NormalizeInput): { markdown: string; title: string } {
  const lines: string[] = [
    '---',
    `title: ${escapeYamlString(input.title)}`,
    `source_url: ${escapeYamlString(input.sourceUrl)}`,
    `retrieved_at: ${input.retrievedAt}`,
    `publisher: ${escapeYamlString(input.domain)}`,
    `content_type: ${input.contentType}`,
    `agent_slug: ${input.agentSlug}`,
  ];
  if (input.queryUsed !== undefined && input.queryUsed !== '') {
    lines.push(`query_used: ${escapeYamlString(input.queryUsed)}`);
  }
  if (input.licenseHint !== undefined && input.licenseHint !== '') {
    lines.push(`license_hint: ${escapeYamlString(input.licenseHint)}`);
  }
  if (input.tags !== undefined && input.tags.length > 0) {
    lines.push(`tags: [${input.tags.map((t) => escapeYamlString(t)).join(', ')}]`);
  }
  lines.push('---', '');
  const body = cleanBody(input.body);
  lines.push(body);
  return {
    markdown: lines.join('\n'),
    title: input.title,
  };
}
