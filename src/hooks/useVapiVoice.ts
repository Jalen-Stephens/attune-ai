'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { validateVapiEnv } from '@/lib/vapi-env';

export type VoiceTranscriptTurn = { role: 'user' | 'assistant'; text: string };

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  [k: string]: unknown;
};

export interface UseVapiVoiceOptions {
  /** Called for each transcript segment (user or assistant) during a call */
  onTranscript?: (turn: VoiceTranscriptTurn) => void;
  /** Optional override for Vapi assistant ID (default: env) */
  assistantIdOverride?: string;
}

export interface UseVapiVoiceResult {
  isConnected: boolean;
  isStarting: boolean;
  error: string | null;
  isReady: boolean;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
}

export function useVapiVoice({
  onTranscript,
  assistantIdOverride,
}: UseVapiVoiceOptions = {}): UseVapiVoiceResult {
  const [isConnected, setConnected] = useState(false);
  const [isStarting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const handlersRef = useRef<{
    callStart: () => void;
    callEnd: () => void;
    message: (m: VapiMessage) => void;
    error: (e: unknown) => void;
  } | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

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
    const onCallEnd = () => {
      setConnected(false);
      setStarting(false);
    };
    const onMessage = (message: VapiMessage) => {
      if (message.type === 'transcript' && message.role && message.transcript) {
        const role = message.role as 'user' | 'assistant';
        const text = message.transcript as string;
        onTranscriptRef.current?.({ role, text });
      }
    };
    const onError = (e: unknown) => {
      const errMsg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'Voice error';
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
  }, [publicKey, assistantId]);

  const startVoice = useCallback(async () => {
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
      await vapiRef.current.start(assistantId);
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
