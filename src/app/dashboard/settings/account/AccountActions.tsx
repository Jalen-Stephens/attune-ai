'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, LogOut, Check } from 'lucide-react';

type AccountActionsProps =
  | { userId: string }
  | { signOut: true };

export function AccountActions(props: AccountActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    if (!('userId' in props)) return;
    navigator.clipboard.writeText(props.userId);
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [props]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  if ('signOut' in props) {
    return (
      <Button
        type="button"
        variant="outline"
        className="rounded-lg"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0 rounded-lg"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy user ID'}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
