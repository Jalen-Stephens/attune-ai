'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChatComposer } from './ChatComposer';
import { AssistantResponse, type AssistantResponseData } from './AssistantResponse';
import { ProviderCards } from './ProviderCards';
import { SuggestedResources } from './SuggestedResources';
import { Skeleton } from '@/components/ui/skeleton';
import { useVapiVoice, type VapiToolResult } from '@/hooks/useVapiVoice';
import { VoiceOscillatingIcon } from '@/components/voice/VoiceOscillatingIcon';
import { cn, toDisplayText, isCallEndedNoise } from '@/lib/utils';
import { PhoneOff } from 'lucide-react';

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
  /** Tool result from Vapi (findProviders or getRagResources) shown during voice call */
  toolResult?: VapiToolResult;
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
  const router = useRouter();
  const [turns, setTurns] = React.useState<ConversationTurn[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const pollAndSyncTranscript = React.useCallback(
    async (vapiCallId: string) => {
      const maxAttempts = 6;
      const delayMs = 1500;
      const sid = sessionIdRef.current;
      if (!sid) return;

      for (let i = 0; i < maxAttempts; i++) {
        try {
          const res = await fetch(`/api/sessions/by-vapi-call/${encodeURIComponent(vapiCallId)}`);
          const data = await res.json();
          const transcript = data.transcript ?? [];
          const summary = data.summary ?? null;
          const voiceSessionId = data.sessionId ?? null;
          if (transcript.length > 0 || (summary && typeof summary === 'string')) {
            await fetch('/api/sessions/link-voice-call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: sid, vapiCallId }),
            }).catch(() => {});

            await new Promise((r) => setTimeout(r, 400));
            const timelineUrl = voiceSessionId
              ? `/api/sessions/${sid}/timeline?voiceSessionId=${encodeURIComponent(voiceSessionId)}`
              : `/api/sessions/${sid}/timeline`;
            const timelineRes = await fetch(timelineUrl);
            if (timelineRes.ok) {
              const { timeline } = await timelineRes.json();
              if (Array.isArray(timeline) && timeline.length > 0) {
                const base = `voice-timeline-${Date.now()}`;
                const timelineTurns: ConversationTurn[] = timeline
                  .map(
                    (
                      item: {
                        type: string;
                        turn?: { role: string; text: string };
                        tool?: string;
                        payload?: Record<string, unknown>;
                      },
                      idx: number
                    ): ConversationTurn | null => {
                      if (item.type === 'transcript' && item.turn) {
                        const text = toDisplayText(item.turn.text) ?? '';
                        return {
                          id: `${base}-t-${idx}`,
                          role: item.turn.role as 'user' | 'assistant',
                          voiceText: text,
                          source: 'voice',
                        };
                      }
                      if (item.type === 'tool' && item.tool === 'findProviders') {
                        const providers = (item.payload?.providers ?? []) as Array<Record<string, unknown>>;
                        return {
                          id: `${base}-p-${idx}`,
                          role: 'assistant',
                          toolResult: {
                            tool: 'findProviders',
                            providers,
                            disclaimer: item.payload?.disclaimer as string | undefined,
                          },
                          source: 'voice',
                        };
                      }
                      if (item.type === 'tool' && item.tool === 'getRagResources') {
                        const resources = (item.payload?.resources ?? []) as Array<Record<string, unknown>>;
                        return {
                          id: `${base}-r-${idx}`,
                          role: 'assistant',
                          toolResult: {
                            tool: 'getRagResources',
                            resources,
                          },
                          source: 'voice',
                        };
                      }
                      return null;
                    }
                  )
                  .filter((t): t is ConversationTurn => t != null);

                setTurns((prev) => {
                  const typedTurns = prev.filter((t) => t.source === 'typed');
                  return [...typedTurns, ...timelineTurns];
                });
                if (timelineTurns.some((t) => t.toolResult?.tool === 'findProviders')) {
                  router.refresh();
                }
                return;
              }
            }

            setTurns((prev) => {
              const typedTurns = prev.filter((t) => t.source === 'typed');
              const liveToolTurns = prev.filter((t) => t.toolResult);
              const base = `voice-clean-${Date.now()}`;
              const voiceTurns: ConversationTurn[] = transcript.map(
                (t: { role: string; text?: string; content?: string }, idx: number) => {
                  const text = toDisplayText(t.text ?? t.content) ?? '';
                  return {
                    id: `${base}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                    role: t.role as 'user' | 'assistant',
                    voiceText: text,
                    source: 'voice' as const,
                  };
                }
              );
              return [...typedTurns, ...liveToolTurns, ...voiceTurns];
            });
            return;
          }
        } catch (_) {
          /* ignore */
        }
        if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs));
      }
    },
    [router]
  );

  const onCallEnd = React.useCallback(
    (vapiCallId: string | null) => {
      setError(null);
      if (vapiCallId) pollAndSyncTranscript(vapiCallId);
    },
    [pollAndSyncTranscript]
  );

  const onToolResult = React.useCallback(
    (result: VapiToolResult) => {
      const turn: ConversationTurn = {
        id: `tool-${result.tool}-${Date.now()}`,
        role: 'assistant',
        toolResult: result,
        source: 'voice',
      };
      setTurns((prev) => [...prev, turn]);
      if (result.tool === 'findProviders') {
        router.refresh();
      }
    },
    [router]
  );

  const {
    isConnected: isVoiceActive,
    isStarting: isVoiceConnecting,
    error: voiceError,
    isReady: isVoiceReady,
    startVoice,
    stopVoice,
  } = useVapiVoice({ onCallEnd, onToolResult });

  const lastShownToolRef = React.useRef<{
    findProviders?: number;
    getRagResources?: number;
  }>({});

  React.useEffect(() => {
    if (!isVoiceActive || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/tool-results`);
        if (!res.ok) return;
        const data = await res.json();
        const last = lastShownToolRef.current;
        if (data.findProviders && data.findProviders.storedAt > (last.findProviders ?? 0)) {
          last.findProviders = data.findProviders.storedAt;
          const turn: ConversationTurn = {
            id: `tool-findProviders-${Date.now()}`,
            role: 'assistant',
            toolResult: {
              tool: 'findProviders',
              providers: data.findProviders.providers ?? [],
              disclaimer: data.findProviders.disclaimer,
            },
            source: 'voice',
          };
          setTurns((prev) => [...prev, turn]);
          router.refresh();
        }
        if (data.getRagResources && data.getRagResources.storedAt > (last.getRagResources ?? 0)) {
          last.getRagResources = data.getRagResources.storedAt;
          const turn: ConversationTurn = {
            id: `tool-getRagResources-${Date.now()}`,
            role: 'assistant',
            toolResult: {
              tool: 'getRagResources',
              resources: data.getRagResources.resources ?? [],
            },
            source: 'voice',
          };
          setTurns((prev) => [...prev, turn]);
        }
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isVoiceActive, sessionId]);

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
      const sid = await ensureSession();
      await startVoice(sid);
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
        const sid = await ensureSession();
        await fetch(`/api/sessions/${sid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });
        await startVoice(sid);
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
                      {turn.role === 'user' && userText != null && (
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 shadow-sm">
                          <p className="text-sm whitespace-pre-wrap">
                            {toDisplayText(userText) ?? ''}
                          </p>
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
                      {turn.role === 'assistant' && turn.toolResult && (
                        <div className="max-w-[95%] sm:max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-4 py-4 shadow-sm">
                          {turn.toolResult.tool === 'findProviders' && (
                            <ProviderCards
                              providers={turn.toolResult.providers}
                              disclaimer={turn.toolResult.disclaimer}
                            />
                          )}
                          {turn.toolResult.tool === 'getRagResources' && (
                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-foreground">Resources for you</h3>
                              {turn.toolResult.resources.length > 0 ? (
                                <SuggestedResources
                                  resources={turn.toolResult.resources.map((r, i) => {
                                    const raw = r as Record<string, unknown>;
                                    return {
                                      id: String(raw.id ?? i),
                                      slug: String(raw.id ?? i),
                                      title: String(raw.title ?? 'Resource'),
                                      snippet: String(raw.snippet ?? ''),
                                      url: raw.url ? String(raw.url) : undefined,
                                      reason: String(raw.why ?? raw.reason ?? ''),
                                      type: String(raw.type ?? 'article'),
                                    };
                                  })}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No resources matched for this topic.
                                </p>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">From voice call</p>
                        </div>
                      )}
                      {turn.role === 'assistant' && turn.voiceText != null && !turn.assistantData && !turn.toolResult && (
                        <div
                          className={cn(
                            'max-w-[95%] sm:max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-4 py-4 shadow-sm',
                            turn.isConnecting && 'border-primary/30 bg-primary/5'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {toDisplayText(turn.voiceText) ?? ''}
                          </p>
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

            {(error || voiceError) && (() => {
              const err = error ?? voiceError;
              if (typeof window !== 'undefined') {
                console.log('[Attune] error / voiceError:', err);
                try {
                  const errUnknown = err as unknown;
                  const serialized =
                    errUnknown instanceof Error
                      ? { name: errUnknown.name, message: errUnknown.message, stack: errUnknown.stack }
                      : typeof err === 'object' && err !== null
                        ? Object.fromEntries(
                            Object.entries(err as Record<string, unknown>).map(([k, v]) => {
                              const vUnknown = v as unknown;
                              return [k, vUnknown instanceof Error ? { message: vUnknown.message, name: vUnknown.name } : v];
                            })
                          )
                        : err;
                  console.log('[Attune] error / voiceError (serialized):', JSON.stringify(serialized, null, 2));
                } catch (e) {
                  console.log('[Attune] error / voiceError (string):', String(err));
                }
              }
              if (isCallEndedNoise(err)) {
                return (
                  <div className="max-w-3xl mx-auto w-full px-4 pb-4">
                    <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground flex items-center gap-3" role="status">
                      <PhoneOff className="h-5 w-5 shrink-0" />
                      <span>Call ended</span>
                    </div>
                  </div>
                );
              }
              return (
                <div className="max-w-3xl mx-auto w-full px-4 pb-4">
                  <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                    {toDisplayText(err) ?? (
                  <div className="max-w-3xl mx-auto w-full px-4 pb-4">
                    <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground flex items-center gap-3" role="status">
                      <PhoneOff className="h-5 w-5 shrink-0" />
                      <span>Call ended</span>
                    </div>
                  </div>
                )}
                  </div>
                </div>
              );
            })()}
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
