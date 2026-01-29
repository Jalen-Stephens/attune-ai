import { createServerClient } from '@/utils/supabase/server';
import { getProfile, upsertProfile } from '@/lib/db';
import { redirect } from 'next/navigation';
import { SettingsNav } from './SettingsNav';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard/settings');
  }

  let profile = await getProfile(user.id);
  if (!profile) {
    profile = await upsertProfile(user.id, user.email ?? null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account, profile, and security
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <SettingsNav />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
