/**
 * Response from POST /api/vapi/call-context.
 * Used to inject user and chat context into Vapi calls so the assistant
 * can greet by name and reference the conversation.
 */
export interface CallContextResponse {
  firstName: string;
  lastName: string;
  sessionId: string | null;
  chatSummary: string;
}
