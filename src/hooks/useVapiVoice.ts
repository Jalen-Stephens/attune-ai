'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { validateVapiEnv } from '@/lib/vapi-env';
import type { CallContextResponse } from '@/lib/vapi/types';
import { sanitizeChatSummary } from '@/lib/vapi/call-context-summary';

export type VoiceTranscriptTurn = { role: 'user' | 'assistant'; text: string };

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  [k: string]: unknown;
};

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
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onCallEndRef = useRef(onCallEnd);
  onTranscriptRef.current = onTranscript;
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

    const onCallStart = () => {
      setConnected(true);
      setStarting(false);
      setError(null);
    };
    const onCallStartSuccess = (e: { callId?: string }) => {
      if (e?.callId && e.callId !== 'unknown') vapiCallIdRef.current = e.callId;
    };
    const onCallEnd = () => {
      const callId = vapiCallIdRef.current;
      vapiCallIdRef.current = null;
      setConnected(false);
      setStarting(false);
      onCallEndRef.current?.(callId);
    };
    const onMessage = (message: VapiMessage) => {
      if (message.type === 'transcript' && message.role && message.transcript) {
        const role = message.role as 'user' | 'assistant';
        const text = message.transcript as string;
        onTranscriptRef.current?.({ role, text });
      }
    };
    const onSpeechStart = () => onSpeechStartRef.current?.();
    const onSpeechEnd = () => onSpeechEndRef.current?.();
    const onError = (e: unknown) => {
      const errMsg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Voice error';
      setError(errMsg);
      setStarting(false);
      setConnected(false);
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
      const v = vapiRef.current;
      if (v) {
        v.stop();
        const h = handlersRef.current;
        if (h && typeof (v as { off?: (e: string, fn: () => void) => void }).off === 'function') {
          (v as { off: (e: string, fn: () => void) => void }).off('call-start', h.callStart);
          (v as { off: (e: string, fn: (e: { callId?: string }) => void) => void }).off('call-start-success', h.callStartSuccess);
          (v as { off: (e: string, fn: (m: VapiMessage) => void) => void }).off('call-end', h.callEnd);
          (v as { off: (e: string, fn: (m: VapiMessage) => void) => void }).off('message', h.message);
          (v as { off: (e: string, fn: () => void) => void }).off('speech-start', h.speechStart);
          (v as { off: (e: string, fn: () => void) => void }).off('speech-end', h.speechEnd);
          (v as { off: (e: string, fn: (e: unknown) => void) => void }).off('error', h.error);
        }
        vapiRef.current = null;
        handlersRef.current = null;
      }
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
            if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
              console.log('[Vapi] variableValues', variableValues);
            }
          } else {
            if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
              console.warn('[Vapi] call-context returned', res.status);
            }
          }
        } catch (e) {
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.warn('[Vapi] call-context failed, starting with generic greeting', e);
          }
        }
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
    vapiRef.current?.stop();
    setConnected(false);
    setStarting(false);
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
