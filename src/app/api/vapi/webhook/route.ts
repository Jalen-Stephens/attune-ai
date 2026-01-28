import { NextRequest, NextResponse } from 'next/server';
import { insertTranscriptTurn, endSession } from '@/lib/db';
import type { VapiWebhookEvent } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const payload: VapiWebhookEvent = await request.json();

    // TODO: Verify webhook signature
    // const signature = request.headers.get('x-vapi-signature');
    // if (!verifySignature(payload, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Extract session ID from payload
    // Vapi webhook payloads may include session metadata or call ID
    // For now, we'll need to store the mapping between Vapi call ID and our session ID
    // This is a simplified version - in production, you'd maintain this mapping
    const sessionId = payload.call?.id || (payload as any).sessionId;

    if (!sessionId) {
      console.warn('No session ID found in webhook payload:', payload);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Handle different event types
    switch (payload.type) {
      case 'transcript':
        if (payload.transcript || payload.message) {
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

      case 'call-ended':
        await endSession(sessionId);
        break;

      case 'call-started':
        // Session already created, just acknowledge
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
