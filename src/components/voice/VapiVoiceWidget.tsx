'use client';

import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { validateVapiEnv } from '@/lib/vapi-env';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Phone, PhoneOff, Trash2, Mic, MicOff } from 'lucide-react';

type TranscriptEntry = { role: string; text: string };

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  functionCall?: { name?: string; arguments?: unknown };
  [k: string]: unknown;
};

export interface VapiVoiceWidgetProps {
  /** Attune agent id (for display / future session linking) */
  agentId?: string;
  /** Agent display name shown in widget header */
  agentName?: string;
  /** Override env assistant ID when using per-agent Vapi assistants */
  assistantIdOverride?: string;
}

export function VapiVoiceWidget({ agentName, assistantIdOverride }: VapiVoiceWidgetProps = {}) {
  const [isConnected, setConnected] = useState(false);
  const [isStarting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const handlersRef = useRef<{
    callStart: () => void;
    callEnd: () => void;
    message: (m: VapiMessage) => void;
    error: (e: unknown) => void;
  } | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
  const assistantId = assistantIdOverride ?? process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? '';

  const runValidation = useCallback(() => {
    try {
      validateVapiEnv();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid Vapi config';
      setError(msg);
      return false;
    }
    setError(null);
    return true;
  }, []);

  useEffect(() => {
    if (!publicKey || !assistantId) {
      runValidation();
      return;
    }
    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const onCallStart = () => {
      setConnected(true);
      setStarting(false);
      setError(null);
    };
    const onCallEnd = () => {
      setConnected(false);
      setStarting(false);
    };
    const onMessage = (message: VapiMessage) => {
      setLastMessage(JSON.stringify(message));

      if (message.type === 'transcript' && message.role && message.transcript) {
        setTranscript((prev) => [
          ...prev,
          { role: message.role as string, text: message.transcript as string },
        ]);
        return;
      }

      // Client-side tool-calls: we can log/show them, but tool results are NOT
      // sent back to the model from the client. Use server-side webhook tools
      // if the model must receive tool outputs.
      if (message.type === 'tool-calls' || message.functionCall) {
        const name =
          (message.functionCall as { name?: string })?.name ??
          (message as { toolCalls?: { name?: string }[] }).toolCalls?.[0]?.name ??
          'unknown';
        setLastToolCall(`Tool: ${name}`);
        console.log('[Vapi] tool-calls', message);
      }
    };
    const onError = (e: unknown) => {
      const errMsg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Vapi error';
      setError(errMsg);
      setStarting(false);
      setConnected(false);
    };

    handlersRef.current = { callStart: onCallStart, callEnd: onCallEnd, message: onMessage, error: onError };
    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('error', onError);

    return () => {
      const v = vapiRef.current;
      if (v) {
        v.stop();
        const h = handlersRef.current;
        if (h && typeof (v as { off?: (e: string, fn: () => void) => void }).off === 'function') {
          (v as { off: (e: string, fn: () => void) => void }).off('call-start', h.callStart);
          (v as { off: (e: string, fn: (m: VapiMessage) => void) => void }).off('call-end', h.callEnd);
          (v as { off: (e: string, fn: (m: VapiMessage) => void) => void }).off('message', h.message);
          (v as { off: (e: string, fn: (e: unknown) => void) => void }).off('error', h.error);
        }
        vapiRef.current = null;
        handlersRef.current = null;
      }
    };
  }, [publicKey, assistantId, runValidation]);

  const startCall = useCallback(async () => {
    if (!runValidation() || !vapiRef.current || !assistantId) return;
    setError(null);
    setStarting(true);
    try {
      await vapiRef.current.start(assistantId);
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed to start call';
      setError(errMsg);
      setStarting(false);
    }
  }, [assistantId, runValidation]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    setConnected(false);
    setStarting(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setLastMessage(null);
    setLastToolCall(null);
  }, []);

  const isDisabled = !publicKey || !assistantId || isStarting;
  const status =
    isConnected ? 'Live' : isStarting ? 'Connecting' : 'Idle';

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex flex-col',
        'rounded-2xl border border-border bg-card shadow-lg',
        'min-w-[320px] max-w-[400px] overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {isConnected ? (
            <Mic className="h-4 w-4 text-green-600" aria-hidden />
          ) : (
            <MicOff className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
          Voice{agentName ? ` · ${agentName}` : ''} · {status}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isConnected ? 'outline' : 'default'}
            className={cn(
              'rounded-lg',
              isConnected && 'border-red-500/60 text-red-600 hover:bg-red-50 hover:text-red-700'
            )}
            onClick={isConnected ? endCall : startCall}
            disabled={isDisabled}
            aria-label={isConnected ? 'End call' : 'Start call'}
          >
            {isConnected ? (
              <>
                <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
                Stop
              </>
            ) : (
              <>
                <Phone className="mr-1.5 h-3.5 w-3.5" />
                Start
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {lastToolCall && (
        <div className="border-b border-border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
          {lastToolCall}
        </div>
      )}

      <div className="flex max-h-64 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {transcript.length === 0 && !lastMessage && (
            <p className="text-sm text-muted-foreground">
              {agentName ? `Start a call with ${agentName} to see the transcript.` : 'Start a call to see the live transcript.'}
            </p>
          )}
          {transcript.map((entry, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                entry.role === 'user'
                  ? 'ml-4 bg-primary/10 text-foreground'
                  : 'mr-4 bg-muted text-foreground'
              )}
            >
              <span className="font-medium text-muted-foreground">{entry.role}: </span>
              {entry.text}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 border-t border-border bg-muted/30 px-4 py-2">
          {lastMessage && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Debug: last event
              </summary>
              <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted/80 p-2 text-[10px] text-muted-foreground">
                {lastMessage}
              </pre>
            </details>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg text-muted-foreground"
              onClick={clearTranscript}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear transcript
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
