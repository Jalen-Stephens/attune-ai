'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';

interface StartSessionButtonProps {
  agentId: string;
  /** Inline/list use: single button, no note */
  compact?: boolean;
  className?: string;
}

export default function StartSessionButton({ agentId, compact, className }: StartSessionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
      }

      const data = await response.json();
      window.location.href = `/dashboard/sessions/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className={className}>
        <Button
          onClick={handleStartSession}
          disabled={loading}
          size="sm"
          className="shrink-0"
        >
          <Phone className="h-4 w-4 mr-1.5" />
          {loading ? 'Starting…' : 'Start'}
        </Button>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleStartSession}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        <Phone className="h-4 w-4 mr-2" />
        {loading ? 'Starting Session...' : 'Start Voice Session'}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-sm text-muted-foreground">
        Note: Vapi integration is stubbed. The session will be created, but the actual voice call will need to be configured with the Vapi SDK.
      </p>
    </div>
  );
}
