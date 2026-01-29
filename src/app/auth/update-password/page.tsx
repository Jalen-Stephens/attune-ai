import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { UpdatePasswordForm } from './UpdatePasswordForm';

export const metadata: Metadata = {
  title: 'Set new password | Attune AI',
  description: 'Set a new password for your Attune AI account.',
};

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 sm:py-20">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Set new password
            </h1>
            <p className="mt-2 text-muted-foreground">
              Enter your new password below
            </p>
          </div>
          <UpdatePasswordForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
