'use client';

import * as React from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLACEHOLDER = 'Enter a prompt here';

export interface ChatComposerProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Optional "Use voice" callback (e.g. navigate to /agents); omit to hide mic */
  onUseVoice?: () => void;
  /** Integrated voice toggle: mic = start/stop call, transcript appended to log */
  onVoiceToggle?: () => void;
  voiceActive?: boolean;
  voiceConnecting?: boolean;
  voiceReady?: boolean;
  /** Gemini-style: single bar with icons inside (default true) */
  inlineIcons?: boolean;
}

export function ChatComposer({
  onSubmit,
  disabled = false,
  placeholder = PLACEHOLDER,
  className,
  onUseVoice,
  onVoiceToggle,
  voiceActive = false,
  voiceConnecting = false,
  voiceReady = true,
  inlineIcons = true,
}: ChatComposerProps) {
  const showVoice = Boolean(onVoiceToggle ?? onUseVoice);
  const [value, setValue] = React.useState('');
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!inlineIcons) {
    return (
      <form onSubmit={(e) => handleSubmit(e)} className={cn('space-y-3', className)}>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          maxLength={2000}
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Message"
        />
        <div className="flex items-center gap-2">
          {showVoice && (
            <button
              type="button"
              onClick={onVoiceToggle ?? onUseVoice}
              disabled={disabled || (Boolean(onVoiceToggle) && (voiceConnecting || !voiceReady))}
              className={cn(
                'inline-flex items-center rounded-lg border px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                voiceActive
                  ? 'border-red-500/60 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-input bg-background hover:bg-muted'
              )}
              aria-label={voiceActive ? 'Stop voice' : 'Start voice'}
            >
              {voiceConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : voiceActive ? (
                <MicOff className="h-4 w-4 mr-2" />
              ) : (
                <Mic className="h-4 w-4 mr-2" />
              )}
              {voiceConnecting ? 'Connecting…' : voiceActive ? 'Stop' : 'Use voice'}
            </button>
          )}
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Send"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => handleSubmit(e)}
      className={cn(
        'flex items-end gap-0 rounded-2xl border border-input bg-background shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
        className
      )}
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        maxLength={2000}
        className="min-h-[52px] max-h-[200px] flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Enter a prompt here"
      />
      <div className="flex items-center gap-0.5 pr-2 pb-2 shrink-0">
        {showVoice && (
          <button
            type="button"
            onClick={onVoiceToggle ?? onUseVoice}
            disabled={disabled || (Boolean(onVoiceToggle) && (voiceConnecting || !voiceReady))}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              voiceActive
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-label={voiceActive ? 'Stop voice' : 'Start voice'}
            title={voiceActive ? 'Stop voice' : 'Start voice'}
          >
            {voiceConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : voiceActive ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
        )}
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
