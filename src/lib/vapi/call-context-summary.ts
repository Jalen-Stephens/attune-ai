/**
 * Summarize recent chat turns into a short, safe-to-read-aloud context for voice calls.
 * Option 1: LLM summarizer (preferred). Option 2: heuristic (latest user messages).
 */

const MAX_TURNS_FOR_SUMMARY = 20;
const SUMMARY_MODEL = 'gpt-4o-mini';

const SUMMARY_SYSTEM = `You are a summarizer for a voice assistant. Given a short conversation transcript, produce a brief summary (2-4 sentences or 3-6 bullet points) that:
- Is safe to read aloud to the user (no sensitive details, no PHI beyond what they already shared)
- Captures the main topics and emotional tone
- Is concise (under 100 words)
- Does not diagnose or add clinical language
Respond with plain text only, no JSON.`;

export interface TranscriptTurnForSummary {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Summarize last N turns with LLM. Returns null on failure (caller should use heuristic).
 */
export async function summarizeTurnsWithLLM(
  turns: TranscriptTurnForSummary[]
): Promise<string | null> {
  if (turns.length === 0) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const transcript = turns
    .slice(-MAX_TURNS_FOR_SUMMARY)
    .map((t) => `${t.role}: ${t.text}`)
    .join('\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM },
          { role: 'user', content: `Summarize this conversation briefly:\n\n${transcript}` },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Heuristic summary: latest user messages, truncated. No PHI stripping; keep minimal.
 */
export function summarizeTurnsHeuristic(turns: TranscriptTurnForSummary[]): string {
  const userTexts = turns
    .filter((t) => t.role === 'user')
    .map((t) => t.text.trim())
    .filter(Boolean)
    .slice(-6);

  if (userTexts.length === 0) return 'The user just started the conversation.';

  const combined = userTexts.join('. ').slice(0, 300);
  return combined.length < userTexts.join('. ').length ? `${combined}…` : combined;
}

const MAX_SANITIZED_SUMMARY_LENGTH = 240;

/** Leading phrases to strip so chatSummary is private background, not "the user described…" */
const LEADING_PHRASES_TO_STRIP = [
  /^the\s+user\s+(?:described|reported|mentioned|said|shared|wrote)\s*[:\-.]?\s*/i,
  /^according\s+to\s+(?:the\s+)?(?:summary|chat|conversation)\s*[:\-.]?\s*/i,
  /^the\s+summary\s+(?:says?|states?|indicates?)\s*[:\-.]?\s*/i,
  /^in\s+(?:the\s+)?(?:chat|conversation)\s*[:\-.]?\s*/i,
];

/**
 * Sanitize chatSummary for variableValues: strip leading meta-phrases, trim length, remove quotes/newlines.
 * Peter uses this as private background only; he must not read it verbatim.
 */
export function sanitizeChatSummary(summary: string): string {
  if (!summary || typeof summary !== 'string') return '';
  let s = summary.trim();
  for (const re of LEADING_PHRASES_TO_STRIP) {
    s = s.replace(re, '').trim();
  }
  s = s.replace(/["'\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > MAX_SANITIZED_SUMMARY_LENGTH) {
    s = s.slice(0, MAX_SANITIZED_SUMMARY_LENGTH).trim();
    if (!/[\s.]$/.test(s)) s += '…';
  }
  return s;
}
