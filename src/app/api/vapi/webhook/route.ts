import { NextRequest, NextResponse } from 'next/server';
import { insertTranscriptTurn, endSession, createOrUpdateSession, logEvent } from '@/lib/db';
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

    // Extract Vapi call ID
    const vapiCallId = payload.call?.id || (payload as any).callId || (payload as any).call_id;
    
    if (!vapiCallId) {
      console.warn('No Vapi call ID found in webhook payload:', payload);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Get or create session ID from Vapi call ID mapping
    let sessionId: string;
    try {
      sessionId = await createOrUpdateSession(
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
          await endSession(sessionId);
          
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
