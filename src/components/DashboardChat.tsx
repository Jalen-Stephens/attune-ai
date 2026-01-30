'use client';

import * as React from 'react';
import { ChatComposer } from './ChatComposer';
import { AssistantResponse, type AssistantResponseData } from './AssistantResponse';
import { Skeleton } from '@/components/ui/skeleton';
import { useVapiVoice } from '@/hooks/useVapiVoice';
import { VoiceOscillatingIcon } from '@/components/voice/VoiceOscillatingIcon';
import { cn } from '@/lib/utils';

const SUGGESTION_CARDS = [
  { text: "I can't sleep and my mind is racing.", label: 'Sleep & racing thoughts' },
  { text: 'I had a fight with my partner.', label: 'Relationship conflict' },
  { text: "I feel cravings again today.", label: 'Cravings & recovery' },
  { text: "I'm overwhelmed and can't focus.", label: 'Overwhelm & focus' },
];

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  /** Typed user message */
  userMessage?: string;
  /** Rich assistant reply (typed chat) */
  assistantData?: AssistantResponseData;
  /** Plain text from voice transcript (user or assistant) */
  voiceText?: string;
  /** When present, turn is from voice; otherwise typed */
  source?: 'typed' | 'voice';
  /** Shown when connecting to voice agent (no navigation) */
  isConnecting?: boolean;
}

export interface DashboardChatProps {
  userName?: string;
}

const DEFAULT_CHAT_AGENT_ID = 'general_reflection';

export default function DashboardChat({ userName = 'there' }: DashboardChatProps) {
  const [turns, setTurns] = React.useState<ConversationTurn[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const pollAndAppendCleanTranscript = React.useCallback(
    async (vapiCallId: string) => {
      const maxAttempts = 6;
      const delayMs = 1500;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const res = await fetch(`/api/sessions/by-vapi-call/${encodeURIComponent(vapiCallId)}`);
          const data = await res.json();
          const transcript = data.transcript ?? [];
          const summary = data.summary ?? null;
          if (transcript.length > 0 || (summary && typeof summary === 'string')) {
            setTurns((prev) => {
              const withoutConnecting = prev.filter((t) => !t.isConnecting);
              const base = `voice-clean-${Date.now()}`;
              const voiceTurns: ConversationTurn[] = transcript.map(
                (t: { role: string; text: string }, i: number) => ({
                  id: `${base}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                  role: t.role as 'user' | 'assistant',
                  voiceText: t.text,
                  source: 'voice',
                })
              );
              return [...withoutConnecting, ...voiceTurns];
            });
            return;
          }
        } catch (_) {
          /* ignore */
        }
        if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs));
      }
    },
    []
  );

  const onCallEnd = React.useCallback(
    (vapiCallId: string | null) => {
      if (vapiCallId) pollAndAppendCleanTranscript(vapiCallId);
    },
    [pollAndAppendCleanTranscript]
  );

  const {
    isConnected: isVoiceActive,
    isStarting: isVoiceConnecting,
    error: voiceError,
    isReady: isVoiceReady,
    startVoice,
    stopVoice,
  } = useVapiVoice({ onCallEnd });

  const ensureSession = React.useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const startRes = await fetch('/api/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: DEFAULT_CHAT_AGENT_ID }),
    });
    if (!startRes.ok) {
      const d = await startRes.json();
      throw new Error(d.error ?? 'Failed to start conversation');
    }
    const d = await startRes.json();
    setSessionId(d.sessionId);
    return d.sessionId as string;
  }, [sessionId]);

  const handleVoiceToggle = React.useCallback(async () => {
    setError(null);
    if (isVoiceActive) {
      stopVoice();
      return;
    }
    try {
      await ensureSession();
      await startVoice();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }, [isVoiceActive, stopVoice, ensureSession, startVoice]);

  const handleStartVoiceWithAgent = React.useCallback(
    async (agentId: string, agentName: string) => {
      setError(null);
      if (isVoiceActive || isVoiceConnecting) return;
      const connectingTurn: ConversationTurn = {
        id: `connecting-${Date.now()}`,
        role: 'assistant',
        voiceText: `Connecting you to the ${agentName}…`,
        source: 'voice',
        isConnecting: true,
      };
      setTurns((prev) => [...prev, connectingTurn]);
      try {
        await ensureSession();
        await startVoice();
      } catch (e) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === connectingTurn.id
              ? { ...t, voiceText: 'Could not connect. Check your mic and try again.', isConnecting: false }
              : t
          )
        );
      }
    },
    [isVoiceActive, isVoiceConnecting, ensureSession, startVoice]
  );

  React.useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, loading]);

  const handleSubmit = async (message: string) => {
    setError(null);
    setLoading(true);

    const userTurn: ConversationTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      userMessage: message,
      source: 'typed',
    };
    setTurns((prev) => [...prev, userTurn]);

    try {
      const currentSessionId = await ensureSession();

      const res = await fetch(`/api/sessions/${currentSessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong');
      }

      const assistantData: AssistantResponseData = {
        assistant_message: data.message,
        suggested_agents: (data.suggestedAgents ?? []).map((a: { agent_id: string; name: string; reason: string }) => ({
          slug: a.agent_id,
          name: a.name,
          reason: a.reason,
          tags: [],
        })),
        suggested_resources: (data.resources ?? []).map((r: { id: string; title: string; snippet: string; url?: string; type: string; reason: string }) => ({
          id: r.id,
          slug: r.id,
          title: r.title,
          snippet: r.snippet,
          url: r.url,
          type: r.type,
          reason: r.reason,
        })),
        safety: { is_crisis: false, message: '' },
      };

      const assistantTurn: ConversationTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        assistantData,
        source: 'typed',
      };
      setTurns((prev) => [...prev, assistantTurn]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showEmptyState = turns.length === 0 && !loading;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Gemini-style: grey frame, centered white card */}
      <div className="flex-1 rounded-2xl bg-muted/50 border border-border/50 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 flex flex-col">
            {showEmptyState ? (
              <>
                {/* Greeting - Gemini style: Hello, Name + How can I help */}
                <div className="flex flex-col items-center text-center pt-12 pb-8 px-4">
                  <h2 className="text-3xl font-semibold text-primary mb-1">
                    Hello, {userName}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    How can I help you today?
                  </p>
                </div>

                {/* Suggestion cards - Gemini style grey-bordered cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto w-full px-4 pb-6">
                  {SUGGESTION_CARDS.map((card) => (
                    <button
                      key={card.text}
                      type="button"
                      onClick={() => handleSubmit(card.text)}
                      disabled={loading}
                      className="rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 text-left p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {card.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {card.label}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div ref={listRef} className="space-y-6 px-4 pt-4 pb-4 max-w-3xl mx-auto w-full">
                {turns.map((turn) => {
                  const userText = turn.userMessage ?? turn.voiceText;
                  return (
                    <div
                      key={turn.id}
                      className={cn(
                        'flex',
                        turn.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {turn.role === 'user' && userText && (
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 shadow-sm">
                          <p className="text-sm whitespace-pre-wrap">{userText}</p>
                          {turn.source === 'voice' && (
                            <p className="text-xs text-primary-foreground/70 mt-1">Voice</p>
                          )}
                        </div>
                      )}
                      {turn.role === 'assistant' && turn.assistantData && (
                        <div className="max-w-[95%] sm:max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-4 py-4 shadow-sm">
                          <AssistantResponse
                            data={turn.assistantData}
                            onStartVoice={handleStartVoiceWithAgent}
                            voiceActive={isVoiceActive}
                            voiceConnecting={isVoiceConnecting}
                            voiceReady={isVoiceReady}
                          />
                        </div>
                      )}
                      {turn.role === 'assistant' && turn.voiceText && !turn.assistantData && (
                        <div
                          className={cn(
                            'max-w-[95%] sm:max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-4 py-4 shadow-sm',
                            turn.isConnecting && 'border-primary/30 bg-primary/5'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{turn.voiceText}</p>
                          {!turn.isConnecting && (
                            <p className="text-xs text-muted-foreground mt-2">Voice</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isVoiceActive && (
                  <div className="flex justify-center py-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-muted-foreground">
                      <VoiceOscillatingIcon className="text-primary" />
                      <span>Listening…</span>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border bg-card px-4 py-4 shadow-sm w-full max-w-[85%] space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="inline-flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        <span className="text-xs">Thinking...</span>
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="pt-2 space-y-2">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(error || voiceError) && (
              <div className="max-w-3xl mx-auto w-full px-4 pb-4">
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                  {error ?? voiceError}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer at bottom - Gemini style: single bar, always visible */}
        <div className="border-t bg-card/80 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto w-full">
            <ChatComposer
              onSubmit={handleSubmit}
              disabled={loading}
              placeholder="Type a message or start talking…"
              inlineIcons
              voiceActive={isVoiceActive}
              voiceConnecting={isVoiceConnecting}
              voiceReady={isVoiceReady}
              onVoiceToggle={handleVoiceToggle}
            />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Not for emergencies. This is supportive coaching, not medical or clinical advice. If you&apos;re in crisis, please contact 988 or emergency services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
