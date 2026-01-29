import { createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountActions } from './AccountActions';

export default async function AccountSettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard/settings/account');
  }

  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Your account details and sign-out
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email</label>
          <p className="text-sm text-muted-foreground rounded-lg border bg-muted/50 px-3 py-2">
            {user.email ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            Email is managed by your sign-in provider and cannot be changed here.
          </p>
        </div>

        {createdAt && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Member since</label>
            <p className="text-sm text-muted-foreground">{createdAt}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">User ID</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 text-xs text-muted-foreground truncate rounded-lg border bg-muted/50 px-3 py-2 font-mono">
              {user.id}
            </code>
            <AccountActions userId={user.id} />
          </div>
          <p className="text-xs text-muted-foreground">
            Internal identifier for your account (e.g. for support).
          </p>
        </div>

        <div className="pt-4 border-t">
          <AccountActions signOut />
        </div>
      </CardContent>
    </Card>
  );
}
