'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

const URL_REGEX = /^https?:\/\/[^\s]+$/;

type ProfileFormProps = {
  userId: string;
  initialValues: {
    full_name: string;
    display_name: string;
    avatar_url: string;
  };
};

export function ProfileForm({ userId, initialValues }: ProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(initialValues.full_name);
  const [displayName, setDisplayName] = React.useState(initialValues.display_name);
  const [avatarUrl, setAvatarUrl] = React.useState(initialValues.avatar_url);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [avatarUrlError, setAvatarUrlError] = React.useState<string | null>(null);

  const hasChanges =
    fullName !== initialValues.full_name ||
    displayName !== initialValues.display_name ||
    avatarUrl !== initialValues.avatar_url;

  const validateAvatarUrl = (value: string): string | null => {
    if (!value.trim()) return null;
    if (!URL_REGEX.test(value.trim())) {
      return 'Please enter a valid URL (e.g. https://…)';
    }
    return null;
  };

  const handleAvatarUrlBlur = () => {
    setAvatarUrlError(validateAvatarUrl(avatarUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const urlErr = validateAvatarUrl(avatarUrl);
    if (urlErr) {
      setAvatarUrlError(urlErr);
      return;
    }
    setAvatarUrlError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-lg" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="rounded-lg" role="status">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Profile saved successfully.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="full_name" className="text-sm font-medium text-foreground">
          Full name
        </label>
        <Input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className="rounded-lg"
          disabled={loading}
          autoComplete="name"
          aria-describedby="full_name_help"
        />
        <p id="full_name_help" className="text-xs text-muted-foreground">
          Your legal or preferred full name
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="display_name" className="text-sm font-medium text-foreground">
          Display name
        </label>
        <Input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How you’d like to be shown"
          className="rounded-lg"
          disabled={loading}
          autoComplete="username"
          aria-describedby="display_name_help"
        />
        <p id="display_name_help" className="text-xs text-muted-foreground">
          Shown in the app (e.g. in conversations)
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="avatar_url" className="text-sm font-medium text-foreground">
          Avatar URL
        </label>
        <Input
          id="avatar_url"
          type="url"
          value={avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            if (avatarUrlError) setAvatarUrlError(validateAvatarUrl(e.target.value));
          }}
          onBlur={handleAvatarUrlBlur}
          placeholder="https://example.com/your-photo.jpg"
          className="rounded-lg"
          disabled={loading}
          autoComplete="url"
          aria-describedby="avatar_url_help avatar_url_error"
          aria-invalid={!!avatarUrlError}
        />
        <p id="avatar_url_help" className="text-xs text-muted-foreground">
          Optional. Link to a profile image
        </p>
        {avatarUrlError && (
          <p id="avatar_url_error" className="text-xs text-destructive" role="alert">
            {avatarUrlError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="rounded-lg"
        disabled={!hasChanges || loading}
      >
        {loading ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
