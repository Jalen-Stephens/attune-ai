'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

interface StartSessionButtonProps {
  agentId: string;
  /** Inline/list use: single button, no note */
  compact?: boolean;
  className?: string;
}

export default function StartSessionButton({ agentId, compact, className }: StartSessionButtonProps) {
  const href = `/dashboard/voice?agentId=${encodeURIComponent(agentId)}`;

  if (compact) {
    return (
      <div className={className}>
        <Button size="sm" className="shrink-0" asChild>
          <Link href={href}>
            <Phone className="h-4 w-4 mr-1.5" />
            Start
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full" asChild>
        <Link href={href}>
          <Phone className="h-4 w-4 mr-2" />
          Start Voice Session
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        You’ll be taken to the voice call interface to start a call with this agent.
      </p>
    </div>
  );
}
