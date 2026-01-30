'use client';

import { cn } from '@/lib/utils';

/** Oscillating bars to show "voice active" during a call */
export function VoiceOscillatingIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-end gap-0.5 h-5', className)}
      aria-hidden
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-current min-h-[4px]"
          style={{
            animation: 'voice-bar 0.6s ease-in-out infinite',
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </span>
  );
}
