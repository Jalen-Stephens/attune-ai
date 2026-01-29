import { createServerClient } from '@/utils/supabase/server';
import { getProfile } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from './ProfileForm';

export default async function ProfileSettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard/settings/profile');
  }

  const profile = await getProfile(user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your display name and profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          userId={user.id}
          initialValues={{
            full_name: profile?.full_name ?? '',
            display_name: profile?.display_name ?? '',
            avatar_url: profile?.avatar_url ?? '',
          }}
        />
      </CardContent>
    </Card>
  );
}
