import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession } from '@/lib/db';
import { getAgentById } from '@/lib/agents';
import { createCall } from '@/lib/vapi';

const StartSessionSchema = z.object({
  agentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId } = StartSessionSchema.parse(body);

    // Get agent profile
    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Create session
    const sessionId = await createSession(agentId);

    // Get webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/vapi/webhook`;

    // Create Vapi call configuration
    const vapiConfig = await createCall({
      sessionId,
      agentPrompt: agent.system_prompt,
      webhookUrl,
    });

    return NextResponse.json({
      sessionId,
      vapi: vapiConfig,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error starting session:', error);
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
