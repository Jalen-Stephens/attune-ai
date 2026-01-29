'use client';

import * as React from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

type PasswordResetFormProps = { email: string };

export function PasswordResetForm({ email }: PasswordResetFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectTo = `${siteUrl}/auth/update-password`;

  const handleSendReset = async () => {
    if (!email.trim()) return;
    setError(null);
    setSent(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (resetError) throw new Error(resetError.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="rounded-lg" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sent && (
        <Alert variant="success" className="rounded-lg" role="status">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Check your email for a link to reset your password.
          </AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        variant="outline"
        className="rounded-lg"
        onClick={handleSendReset}
        disabled={loading || !email.trim()}
        aria-label="Send password reset email"
      >
        {loading ? 'Sending…' : 'Send password reset email'}
      </Button>
    </div>
  );
}
