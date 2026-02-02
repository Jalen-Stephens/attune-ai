/**
 * Log Vapi tool calls (name, sessionId, success, duration).
 * Optionally inserts into events table when sessionId is provided.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

export type ToolLogParams = {
  toolName: string;
  sessionId?: string | null;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  payload?: Record<string, unknown>;
};

export async function logToolCall(params: ToolLogParams): Promise<void> {
  const { toolName, sessionId, success, durationMs, errorMessage, payload } = params;

  const logLine = `[Vapi Tool] ${toolName} | sessionId=${sessionId ?? 'n/a'} | success=${success} | duration=${durationMs}ms${errorMessage ? ` | error=${errorMessage}` : ''}`;
  if (success) {
    console.info(logLine);
  } else {
    console.error(logLine);
  }

  if (sessionId) {
    try {
      const supabase = createServiceRoleClient();
      if (success) {
        await supabase.from('events').insert({
          session_id: sessionId,
          event_type: `tool_${toolName}`,
          payload_json: {
            duration_ms: durationMs,
            ...payload,
          },
        });
      } else {
        await supabase.from('events').insert({
          session_id: sessionId,
          event_type: `tool_${toolName}_failed`,
          payload_json: {
            duration_ms: durationMs,
            error: errorMessage,
            ...payload,
          },
        });
      }
    } catch (err) {
      console.error('Failed to insert tool event:', err);
    }
  }
}
