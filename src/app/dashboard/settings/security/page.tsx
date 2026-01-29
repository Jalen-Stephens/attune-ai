import { createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordResetForm } from './PasswordResetForm';

export default async function SecuritySettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard/settings/security');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Change your password or manage security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Password</h4>
          <p className="text-sm text-muted-foreground">
            Send a password reset link to your email. You’ll set a new password on the next page.
          </p>
          <PasswordResetForm email={user.email ?? ''} />
        </div>
      </CardContent>
    </Card>
  );
}
