'use client';

import { useState } from 'react';

interface StartSessionButtonProps {
  agentId: string;
}

export default function StartSessionButton({ agentId }: StartSessionButtonProps) {
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
      
      // TODO: Integrate Vapi client SDK to initiate the call
      // For now, just redirect to the session detail page
      window.location.href = `/dashboard/sessions/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleStartSession}
        disabled={loading}
        className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Starting Session...' : 'Start Voice Session'}
      </button>
      {error && (
        <p className="mt-4 text-red-600 text-sm">{error}</p>
      )}
      <p className="mt-4 text-sm text-gray-600">
        Note: Vapi integration is stubbed. The session will be created, but the actual voice call will need to be configured with the Vapi SDK.
      </p>
    </div>
  );
}
