import Link from 'next/link';
import { createServerClient } from '@/utils/supabase/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/Container';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Shield,
  Sparkles,
  ArrowRight,
  FileText,
  Lock,
} from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <Container className="relative py-16 sm:py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                    AI support that listens.{' '}
                    <span className="text-primary">Specialized for you.</span>
                  </h1>
                  <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
                    Attune AI gives you structured, evidence-informed conversations through
                    specialized agents—whether you&apos;re working on cravings, relationships,
                    family dynamics, or everyday stress. Your pace, your goals.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {user ? (
                    <Button size="lg" className="rounded-lg shadow-md hover:shadow-lg transition-shadow" asChild>
                      <Link href="/dashboard">
                        Go to dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" className="rounded-lg shadow-md hover:shadow-lg transition-shadow" asChild>
                        <Link href="/auth/signup">Sign up</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="rounded-lg" asChild>
                        <Link href="/auth/login">Log in</Link>
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary/80" />
                    Secure by design
                  </span>
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary/80" />
                    Your data stays yours
                  </span>
                </div>
              </div>
              {/* Product preview mock */}
              <div className="relative">
                <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden max-w-md mx-auto lg:max-w-none">
                  <div className="h-10 flex items-center gap-2 px-4 border-b bg-muted/50">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-4 text-xs text-muted-foreground font-medium">Conversation</span>
                  </div>
                  <div className="p-6 space-y-4 min-h-[280px]">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-full rounded bg-muted" />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="space-y-2 flex-1 max-w-[80%] text-right">
                        <div className="h-3 w-full rounded bg-primary/20 ml-auto" />
                        <div className="h-3 w-2/3 rounded bg-primary/20 ml-auto" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-4/5 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-border">
                      <div className="h-9 flex-1 rounded-lg bg-muted/80" />
                      <Button size="sm" className="rounded-lg">Send</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* What we do */}
        <section className="py-16 sm:py-20 lg:py-24 border-t border-border/40 bg-muted/20">
          <Container>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                What we do
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Specialized agents, one platform.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="p-2.5 rounded-lg bg-primary/10 w-fit">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Structured conversations</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Voice or text sessions with agents trained in reflective listening, goal-setting, and evidence-informed frameworks.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="p-2.5 rounded-lg bg-primary/10 w-fit">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Domain-specific support</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Choose an agent that fits: addiction support, relationship communication, family dynamics, or general reflection.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="p-2.5 rounded-lg bg-primary/10 w-fit">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Sessions that stick</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Summaries and follow-ups so you can track progress and share with your care team when you choose.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-20 lg:py-24">
          <Container>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Three steps to your first conversation.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="relative text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-lg mb-4">
                  1
                </div>
                <h3 className="font-semibold text-foreground text-lg">Sign up and pick an agent</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  Create an account and choose from specialized agents—addiction support, relationships, family, or general reflection.
                </p>
              </div>
              <div className="relative text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-lg mb-4">
                  2
                </div>
                <h3 className="font-semibold text-foreground text-lg">Start a conversation</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  Begin a voice or text session. The agent listens, reflects, and guides using evidence-informed prompts—at your pace.
                </p>
              </div>
              <div className="relative text-center md:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-semibold text-lg mb-4">
                  3
                </div>
                <h3 className="font-semibold text-foreground text-lg">Review and follow up</h3>
                <p className="mt-2 text-muted-foreground text-sm">
                  Get a session summary, track your journey, and optionally use referrals to connect with specialists when you&apos;re ready.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Security & Privacy */}
        <section className="py-16 sm:py-20 lg:py-24 border-t border-border/40 bg-muted/20">
          <Container>
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 lg:p-12 max-w-3xl mx-auto text-center">
              <Lock className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Security &amp; Privacy
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                We take your privacy seriously. Data is encrypted, we don&apos;t sell your information,
                and you control what you share. Read our full policy for details.
              </p>
              <Button variant="outline" className="mt-6 rounded-lg" asChild>
                <Link href="/privacy">Privacy policy</Link>
              </Button>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
