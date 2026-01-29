import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/utils/supabase/server';
import { checkCrisis } from '@/lib/recommendations/crisisDetection';
import { recommendAgents } from '@/lib/recommendations/recommendAgents';
import { retrieveResources } from '@/lib/recommendations/retrieveResources';

const MIN_LENGTH = 3;
const MAX_LENGTH = 2000;

const BodySchema = z.object({
  query: z.string().min(MIN_LENGTH, `Please enter at least ${MIN_LENGTH} characters.`).max(MAX_LENGTH, `Please keep your message under ${MAX_LENGTH} characters.`),
});

export type RecommendationsResponse = {
  assistant_message: string;
  clarifying_question?: string;
  suggested_agents: Array<{ slug: string; name: string; reason: string; tags: string[] }>;
  suggested_resources: Array<{
    id: string;
    slug: string;
    title: string;
    snippet: string;
    url?: string;
    reason: string;
    type: string;
  }>;
  quick_plan?: string[];
  breathing_prompt?: string;
  safety?: { is_crisis: boolean; message: string };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = BodySchema.parse(body);

    const supabase = await createServerClient();
    await supabase.auth.getUser(); // optional: ensure session exists for protected routes

    const safety = checkCrisis(query);
    if (safety.isCrisis) {
      return NextResponse.json({
        assistant_message: safety.message,
        clarifying_question: undefined,
        suggested_agents: [],
        suggested_resources: [
          {
            id: '988',
            slug: '988-lifeline',
            title: '988 Suicide & Crisis Lifeline',
            snippet: 'Call or text 988 in the US, 24/7, free and confidential.',
            url: 'https://988lifeline.org',
            reason: 'Immediate support.',
            type: 'guide',
          },
        ],
        quick_plan: undefined,
        breathing_prompt: undefined,
        safety: { is_crisis: true, message: safety.message },
      } satisfies RecommendationsResponse);
    }

    const [suggested_agents, suggested_resources] = await Promise.all([
      recommendAgents(query, 5),
      Promise.resolve(retrieveResources(query, 5)),
    ]);

    // Short empathetic summary (template-based; swap for LLM when available)
    const assistant_message = `Thanks for sharing that. It sounds like you're going through something real right now. Here are some next steps that might help.`;
    const clarifying_question = suggested_agents.length === 0 && suggested_resources.length === 0
      ? 'Would you like to tell me a bit more about what’s going on so I can suggest a better fit?'
      : undefined;

    const quick_plan: string[] = [];
    if (suggested_agents.length > 0) quick_plan.push('Try starting a short conversation with one of the suggested agents.');
    if (suggested_resources.length > 0) quick_plan.push('Skim one or two of the resources that feel relevant.');
    quick_plan.push('Take one small step today—even a tiny one counts.');
    const breathing_prompt = 'If things feel intense, try four slow breaths: in for 4, hold for 4, out for 4, hold for 4.';

    const payload: RecommendationsResponse = {
      assistant_message,
      clarifying_question,
      suggested_agents,
      suggested_resources,
      quick_plan: quick_plan.length > 0 ? quick_plan : undefined,
      breathing_prompt,
      safety: { is_crisis: false, message: '' },
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
