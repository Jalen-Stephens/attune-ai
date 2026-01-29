import { createServerClient } from '@/utils/supabase/server';
import DashboardChat from '@/components/DashboardChat';

export default async function DashboardHome() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.email?.split('@')[0]) ||
    null;

  let profileDisplayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    profileDisplayName = profile?.display_name?.trim() ?? null;
  }

  const userName = profileDisplayName || displayName || 'there';

  return (
    <div className="w-full">
      <DashboardChat userName={userName} />
    </div>
  );
}
