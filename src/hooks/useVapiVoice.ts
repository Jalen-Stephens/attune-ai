'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { validateVapiEnv } from '@/lib/vapi-env';
import type { CallContextResponse } from '@/lib/vapi/types';
import { sanitizeChatSummary } from '@/lib/vapi/call-context-summary';
import { toDisplayText } from '@/lib/utils';

export type VoiceTranscriptTurn = { role: 'user' | 'assistant'; text: string };

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  functionCall?: { name?: string; arguments?: unknown };
  toolCalls?: Array<{ name?: string; result?: unknown; [k: string]: unknown }>;
  [k: string]: unknown;
};

/** Tool result from findProviders or getRagResources for display in chat */
export type VapiToolResult =
  | { tool: 'findProviders'; providers: Array<Record<string, unknown>>; disclaimer?: string }
  | { tool: 'getRagResources'; resources: Array<Record<string, unknown>> };

function isMeetingEndedNoise(err: unknown): boolean {
  const msg =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err && typeof err === 'object' && 'error' in err && typeof (err as { error: unknown }).error === 'object'
            ? String((err as { error: { message?: string } }).error?.message ?? '')
            : '';
  return /Meeting ended due to ejection|Meeting has ended|ejection|due to ejection|call ended/i.test(msg);
}

/**
 * Build generic first message using name only. chatSummary is passed via variableValues
 * so Peter can reference it as private background, not read verbatim.
 */
function buildFirstMessageFromContext(ctx: CallContextResponse): string {
  const firstName = (ctx.firstName ?? '').trim();
  if (firstName) {
    return `Hi ${firstName}, I'm Peter. What's been going on?`;
  }
  return `Hi, I'm Peter. What's been going on?`;
}

export interface UseVapiVoiceOptions {
  /** Called for each transcript segment (user or assistant) during a call */
  onTranscript?: (turn: VoiceTranscriptTurn) => void;
  /** Called when a server-side tool returns a result (e.g. findProviders, getRagResources). Enable tool-calls-result in Vapi assistant clientMessages. */
  onToolResult?: (result: VapiToolResult) => void;
  /** User started speaking; use to begin buffering user transcript */
  onSpeechStart?: () => void;
  /** User stopped speaking; use to commit buffered user transcript */
  onSpeechEnd?: () => void;
  /** Call ended; use to commit any remaining buffered transcript. Receives vapiCallId when available (for polling clean transcript). */
  onCallEnd?: (vapiCallId: string | null) => void;
  /** Optional override for Vapi assistant ID (default: env) */
  assistantIdOverride?: string;
}

export interface UseVapiVoiceResult {
  isConnected: boolean;
  isStarting: boolean;
  error: string | null;
  isReady: boolean;
  /** Start voice call. Pass sessionId to inject user/chat context (name + summary) into the greeting. */
  startVoice: (sessionId?: string) => Promise<void>;
  stopVoice: () => void;
}

export function useVapiVoice({
  onTranscript,
  onToolResult,
  onSpeechStart,
  onSpeechEnd,
  onCallEnd,
  assistantIdOverride,
}: UseVapiVoiceOptions = {}): UseVapiVoiceResult {
  const [isConnected, setConnected] = useState(false);
  const [isStarting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const vapiCallIdRef = useRef<string | null>(null);
  const didTeardownRef = useRef(false);
  const teardownOnceRef = useRef<(reason: string) => void>(() => {});
  const handlersRef = useRef<{
    callStart: () => void;
    callStartSuccess: (e: { callId?: string }) => void;
    callEnd: () => void;
    message: (m: VapiMessage) => void;
    speechStart: () => void;
    speechEnd: () => void;
    error: (e: unknown) => void;
  } | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onToolResultRef = useRef(onToolResult);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onCallEndRef = useRef(onCallEnd);
  onTranscriptRef.current = onTranscript;
  onToolResultRef.current = onToolResult;
  onSpeechStartRef.current = onSpeechStart;
  onSpeechEndRef.current = onSpeechEnd;
  onCallEndRef.current = onCallEnd;

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
  const assistantId = assistantIdOverride ?? process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? '';
  const isReady = Boolean(publicKey && assistantId);

  useEffect(() => {
    if (!publicKey || !assistantId) {
      try {
        validateVapiEnv();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid Vapi config');
      }
      return;
    }
    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const teardownOnce = (reason: string) => {
      if (didTeardownRef.current) return;
      didTeardownRef.current = true;
      const callId = vapiCallIdRef.current;
      vapiCallIdRef.current = null;
      const v = vapiRef.current;
      if (v) {
        const h = handlersRef.current;
        if (h && typeof (v as { off?: (e: string, fn: unknown) => void }).off === 'function') {
          (v as { off: (e: string, fn: unknown) => void }).off('call-start', h.callStart);
          (v as { off: (e: string, fn: unknown) => void }).off('call-start-success', h.callStartSuccess);
          (v as { off: (e: string, fn: unknown) => void }).off('call-end', h.callEnd);
          (v as { off: (e: string, fn: unknown) => void }).off('message', h.message);
          (v as { off: (e: string, fn: unknown) => void }).off('speech-start', h.speechStart);
          (v as { off: (e: string, fn: unknown) => void }).off('speech-end', h.speechEnd);
          (v as { off: (e: string, fn: unknown) => void }).off('error', h.error);
        }
        Promise.resolve(v.stop()).catch(() => {
          /* ignore e.g. "Meeting ended due to ejection: Meeting has ended" */
        });
        vapiRef.current = null;
        handlersRef.current = null;
      }
      setConnected(false);
      setStarting(false);
      onCallEndRef.current?.(callId);
    };
    teardownOnceRef.current = teardownOnce;

    const onCallStart = () => {
      didTeardownRef.current = false;
      setConnected(true);
      setStarting(false);
      setError(null);
    };
    const onCallStartSuccess = (e: { callId?: string }) => {
      if (e?.callId && e.callId !== 'unknown') vapiCallIdRef.current = e.callId;
    };
    const onCallEnd = () => {
      teardownOnce('ended');
    };
    const onMessage = (message: VapiMessage) => {
      const msgType = message?.type ?? (message as { message?: { type?: string } }).message?.type;
      const allowedTypes = ['transcript', 'tool-calls-result', 'function-call-result'];
      if (msgType && !allowedTypes.includes(msgType)) return;

      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        if (msgType && ['tool-calls-result', 'function-call-result', 'tool-calls', 'function-call'].includes(msgType)) {
          console.log('[Vapi] message type:', msgType, message);
        }
      }
      if (message.type === 'transcript' && message.role) {
        const text = toDisplayText(message.transcript) ?? '';
        if (text) {
          const role = message.role as 'user' | 'assistant';
          onTranscriptRef.current?.({ role, text });
        }
        return;
      }
      if (message.type === 'tool-calls-result' || message.type === 'function-call-result') {
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('[Vapi] tool-calls-result:', message);
        }
        const toolCallResult = (message as { toolCallResult?: unknown }).toolCallResult;
        const toolCalls = (message as { toolCalls?: unknown[] }).toolCalls;
        const calls: unknown[] = Array.isArray(toolCalls)
          ? toolCalls
          : toolCallResult != null
            ? [toolCallResult]
            : [];

        const tryEmit = (data: Record<string, unknown>, name?: string) => {
          if (Array.isArray(data.providers)) {
            onToolResultRef.current?.({
              tool: 'findProviders',
              providers: data.providers,
              disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined,
            });
            return true;
          }
          if (Array.isArray(data.resources)) {
            onToolResultRef.current?.({
              tool: 'getRagResources',
              resources: data.resources,
            });
            return true;
          }
          return false;
        };

        for (const tc of calls) {
          const tcObj = tc as Record<string, unknown>;
          const name = tcObj?.name as string | undefined;
          let result = tcObj?.result;
          if (result == null) result = tcObj;
          if (typeof result === 'string') {
            try {
              result = JSON.parse(result) as Record<string, unknown>;
            } catch {
              continue;
            }
          }
          const data = typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : {};
          if (tryEmit(data)) continue;
          if (name === 'findProviders' || name === 'getRagResources') tryEmit(data);
        }
      }
    };
    const onSpeechStart = () => onSpeechStartRef.current?.();
    const onSpeechEnd = () => onSpeechEndRef.current?.();
    const onError = (e: unknown) => {
      if (isMeetingEndedNoise(e)) {
        teardownOnce('ended');
        return;
      }
      let errMsg = 'Voice error';
      if (e instanceof Error) errMsg = e.message;
      else if (typeof e === 'string') errMsg = e;
      else if (e && typeof e === 'object' && 'message' in e) {
        const m = (e as { message: unknown }).message;
        if (typeof m === 'string') errMsg = m;
        else if (m != null) errMsg = String(m);
      } else if (e != null) errMsg = String(e);
      setError(typeof errMsg === 'string' ? errMsg : 'Voice error');
      teardownOnce('error');
    };

    handlersRef.current = {
      callStart: onCallStart,
      callStartSuccess: onCallStartSuccess,
      callEnd: onCallEnd,
      message: onMessage,
      speechStart: onSpeechStart,
      speechEnd: onSpeechEnd,
      error: onError,
    };
    vapi.on('call-start', onCallStart);
    vapi.on('call-start-success', onCallStartSuccess);
    vapi.on('call-end', onCallEnd);
    vapi.on('message', onMessage);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd);
    vapi.on('error', onError);

    return () => {
      teardownOnce('unmount');
    };
  }, [publicKey, assistantId]);

  const startVoice = useCallback(async (sessionId?: string) => {
    if (!isReady || !vapiRef.current) {
      try {
        validateVapiEnv();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid Vapi config');
      }
      return;
    }
    setError(null);
    setStarting(true);
    try {
      let assistantOverrides: { firstMessage?: string; variableValues?: Record<string, string> } | undefined;
      if (sessionId) {
        try {
          const res = await fetch('/api/vapi/call-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          if (res.ok) {
            const ctx = (await res.json()) as CallContextResponse;
            const variableValues: Record<string, string> = {
              firstName: (ctx.firstName ?? '').trim(),
              lastName: (ctx.lastName ?? '').trim(),
              sessionId: (ctx.sessionId ?? '').trim(),
              chatSummary: sanitizeChatSummary(ctx.chatSummary ?? ''),
            };
            assistantOverrides = {
              firstMessage: buildFirstMessageFromContext(ctx),
              variableValues,
            };
            if (typeof window !== 'undefined') {
              console.log('[Vapi] call initiation payload:', JSON.stringify({
                assistantId,
                sessionId,
                variableValues,
                firstMessage: assistantOverrides.firstMessage,
                sessionIdInVariableValues: variableValues.sessionId,
              }, null, 2));
            }
          } else {
            if (typeof window !== 'undefined') {
              console.warn('[Vapi] call-context returned', res.status, '- no variableValues/sessionId will be passed');
            }
          }
        } catch (e) {
          if (typeof window !== 'undefined') {
            console.warn('[Vapi] call-context failed, starting with generic greeting', e);
          }
        }
      }
      if (typeof window !== 'undefined' && !assistantOverrides) {
        console.log('[Vapi] call initiation: no sessionId provided, starting without variableValues');
      }
      await vapiRef.current.start(assistantId, assistantOverrides as Parameters<Vapi['start']>[1]);
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed to start voice';
      setError(errMsg);
      setStarting(false);
      throw e;
    }
  }, [assistantId, isReady]);

  const stopVoice = useCallback(() => {
    teardownOnceRef.current?.('user');
  }, []);

  return {
    isConnected,
    isStarting,
    error,
    isReady,
    startVoice,
    stopVoice,
  };
}
