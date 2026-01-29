import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = {
  title: 'Sign up | Attune AI',
  description: 'Create your Attune AI account.',
};

export default async function SignupPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 sm:py-20">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sign up</h1>
            <p className="mt-2 text-muted-foreground">
              Create your Attune AI account to get started
            </p>
          </div>
          <SignupForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
