import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { insertTranscriptTurn, endSessionServiceRole, createOrUpdateSessionServiceRole, logEvent, replaceTranscriptTurns, getSessionByVapiCallId, saveSummaryServiceRole } from '@/lib/db';
import { verifyVapiSignature } from '@/lib/webhook-verification';
import { 
  createOrUpdateIntakeTool, 
  lookupSpecialistsTool, 
  sendReferralEmailTool 
} from '@/lib/agent-tools';
import type { VapiWebhookEvent } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload: VapiWebhookEvent = JSON.parse(body);

    // Verify webhook signature (Vapi uses {timestamp}.{body} when Include Timestamp is on)
    const signature = request.headers.get('x-vapi-signature');
    const timestamp = request.headers.get('x-timestamp');
    if (!verifyVapiSignature(body, signature, timestamp)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // In development, write last *live* webhook payload (transcript only) for inspection
    if (process.env.NODE_ENV === 'development') {
      const skipTypes = ['call-ended', 'end-of-call-report'];
      const topLevel = (payload as { type?: string }).type;
      const nested = (payload as { message?: { type?: string } }).message?.type;
      const isEnd = skipTypes.includes(topLevel ?? '') || skipTypes.includes(nested ?? '');
      if (!isEnd && (topLevel === 'transcript' || topLevel === 'call-started' || nested === 'transcript')) {
        try {
          const out = join(process.cwd(), 'vapi-webhook-last.json');
          const blob = {
            _receivedAt: new Date().toISOString(),
            _webhookType: topLevel ?? nested ?? 'unknown',
            ...payload,
          };
          await writeFile(out, JSON.stringify(blob, null, 2), 'utf-8');
        } catch (e) {
          console.warn('Could not write vapi-webhook-last.json:', e);
        }
      }
    }

    // Handle end-of-call-report: replace transcript with clean artifact, save Vapi summary
    const msg = (payload as { message?: { type?: string; call?: { id?: string }; artifact?: { messages?: Array<{ role: string; message?: string; time?: number }> }; analysis?: { summary?: string } } }).message;
    if (msg?.type === 'end-of-call-report') {
      const callId = msg.call?.id ?? (payload as any).call?.id ?? (payload as any).callId ?? (payload as any).call_id;
      if (callId) {
        const detail = await getSessionByVapiCallId(callId);
        if (detail) {
          const artifactMessages = msg.artifact?.messages ?? (payload as any).artifact?.messages ?? [];
          const turns = artifactMessages
            .filter((m: { role?: string }) => m.role === 'user' || m.role === 'bot')
            .sort((a: { time?: number }, b: { time?: number }) => (a.time ?? 0) - (b.time ?? 0))
            .map((m: { role?: string; message?: string; content?: string; time?: number }) => ({
              role: (m.role === 'bot' ? 'assistant' : 'user') as 'user' | 'assistant',
              text: ((m.message ?? (m as { content?: string }).content) ?? '').trim(),
              timestamp: m.time ? new Date(m.time).toISOString() : undefined,
            }))
            .filter((t: { text: string }) => !!t.text);
          if (turns.length) await replaceTranscriptTurns(detail.session.id, turns);
          const summary = msg.analysis?.summary ?? (payload as any).analysis?.summary;
          if (typeof summary === 'string' && summary.trim()) {
            await saveSummaryServiceRole(detail.session.id, summary.trim());
          }
          await endSessionServiceRole(detail.session.id);
        }
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Extract Vapi call ID
    const vapiCallId = payload.call?.id ?? (payload as any).callId ?? (payload as any).call_id ?? msg?.call?.id;
    
    if (!vapiCallId) {
      console.warn('No Vapi call ID found in webhook payload:', payload);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Get or create session ID from Vapi call ID mapping (service role—webhook has no user context)
    let sessionId: string;
    try {
      sessionId = await createOrUpdateSessionServiceRole(
        (payload as any).agentId || 'general_reflection', // Default agent
        vapiCallId,
        (payload as any).userEmail || (payload as any).user_email,
        (payload as any).userPhone || (payload as any).user_phone,
        'voice'
      );
    } catch (error) {
      console.error('Error creating/updating session:', error);
      return NextResponse.json({ received: true, error: 'Session creation failed' }, { status: 200 });
    }

    // Handle different event types
    switch (payload.type) {
      case 'call-started':
        // Session already created above, just log
        await logEvent(sessionId, 'call_started', {
          vapi_call_id: vapiCallId,
        });
        break;

      case 'transcript':
        if (sessionId && (payload.transcript || payload.message)) {
          const transcript = payload.transcript || payload.message;
          const t = transcript as { text?: string; content?: string; role?: 'user' | 'assistant'; timestamp?: string };
          const text = t?.text ?? t?.content;
          if (text && t?.role) {
            await insertTranscriptTurn(
              sessionId,
              t.role as 'user' | 'assistant',
              text,
              t.timestamp || payload.timestamp
            );
          }
        }
        break;

      case 'function-call':
        // Handle agent function calls
        if (sessionId && (payload as any).functionCall) {
          const functionCall = (payload as any).functionCall;
          const functionName = functionCall.name;
          const functionArgs = functionCall.arguments || {};

          let result: any = { success: false, message: 'Unknown function' };

          try {
            switch (functionName) {
              case 'createOrUpdateIntake':
                result = await createOrUpdateIntakeTool(sessionId, functionArgs);
                break;
              
              case 'lookupSpecialists':
                result = await lookupSpecialistsTool(sessionId);
                break;
              
              case 'sendReferralEmail':
                result = await sendReferralEmailTool(sessionId);
                break;
              
              default:
                console.warn('Unknown function call:', functionName);
            }

            await logEvent(sessionId, 'function_call', {
              function_name: functionName,
              success: result.success,
            });

            // Return result to Vapi (they will handle the response format)
            return NextResponse.json({
              result: result.message,
              success: result.success,
              data: result,
            });
          } catch (error) {
            console.error('Error handling function call:', error);
            await logEvent(sessionId, 'function_call_error', {
              function_name: functionName,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            
            return NextResponse.json({
              result: 'An error occurred processing your request.',
              success: false,
            });
          }
        }
        break;

      case 'call-ended':
        if (sessionId) {
          await endSessionServiceRole(sessionId);
          
          // Auto-send referral email if intake is complete and consented
          try {
            await sendReferralEmailTool(sessionId);
          } catch (error) {
            console.error('Error auto-sending referral email:', error);
            // Don't fail the webhook if email fails
          }
        }
        break;

      default:
        console.log('Unhandled webhook event type:', payload.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 200 to prevent Vapi from retrying
    return NextResponse.json({ received: true, error: 'Processing failed' }, { status: 200 });
  }
}
