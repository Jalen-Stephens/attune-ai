'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

const MIN_LENGTH = 6;

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      router.refresh();
      setTimeout(() => router.push('/dashboard/settings/security'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert variant="success" className="rounded-lg">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Password updated. Redirecting to settings…
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-lg" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={MIN_LENGTH}
          autoComplete="new-password"
          className="rounded-lg"
          disabled={loading}
          aria-describedby="password_help"
        />
        <p id="password_help" className="text-xs text-muted-foreground">
          At least {MIN_LENGTH} characters
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <Input
          id="confirm"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={MIN_LENGTH}
          autoComplete="new-password"
          className="rounded-lg"
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        className="w-full rounded-lg shadow-sm"
        size="lg"
        disabled={loading}
      >
        {loading ? 'Updating…' : 'Set password'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">
          Back to settings
        </Link>
      </p>
    </form>
  );
}
