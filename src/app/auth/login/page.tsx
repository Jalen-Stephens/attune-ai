import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Log in | Attune AI',
  description: 'Log in to your Attune AI account.',
};

type Props = { searchParams: Promise<{ redirectTo?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { redirectTo } = await searchParams;
    redirect(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard');
  }

  const { redirectTo } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 sm:py-20">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Log in</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to your Attune AI account
            </p>
          </div>
          <LoginForm redirectTo={redirectTo} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
