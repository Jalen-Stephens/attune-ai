import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/Container';
import { MessageSquare, Heart, Users, Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About | Attune AI',
  description: 'Learn about Attune AI—voice- and text-based AI support with specialized agents for addiction, relationships, family, and reflection.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              About Attune AI
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Attune AI is a voice- and text-based AI support platform built around specialized
              agents. We&apos;re here to help people work through everyday challenges—cravings,
              relationship communication, family dynamics, stress—with structured, evidence-informed
              conversations that feel supportive, not prescriptive.
            </p>

            <section className="mt-12 space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">What we&apos;re building</h2>
              <p className="text-muted-foreground leading-relaxed">
                We&apos;re building AI agents that listen, reflect, and guide—not diagnose or treat.
                Each agent is designed for a specific domain: addiction support, relationship and
                couples communication, family communication, and general reflection. They use
                evidence-informed frameworks (e.g., motivational interviewing, reflective listening)
                and retrieval-augmented knowledge so conversations stay grounded and helpful.
              </p>
            </section>

            <section className="mt-12 space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Who it&apos;s for</h2>
              <p className="text-muted-foreground leading-relaxed">
                Attune AI is for anyone who wants a structured space to think through cravings,
                communication, family dynamics, or everyday stress. It&apos;s not a replacement for
                therapy or medical care—it&apos;s a supportive tool that can complement your
                journey. We work with individuals, and in the future we aim to support care teams
                and referral workflows so your progress can connect to specialists when you&apos;re
                ready.
              </p>
            </section>

            <section className="mt-12 space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Our mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our mission is to make evidence-informed support accessible, private, and
                human-centered. We believe AI can extend reflective, non-judgmental conversation
                without replacing the irreplaceable value of human connection. We design for
                transparency, safety, and user control—so you always know what the system does and
                what happens with your data.
              </p>
            </section>

            <section className="mt-12 space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">The story so far</h2>
              <p className="text-muted-foreground leading-relaxed">
                Attune AI started from a simple idea: specialized conversational agents, each
                tuned to a real domain of need, could offer consistent support between human
                touchpoints. We built the platform around voice and text sessions, session
                summaries, and optional specialist referrals—so the experience can grow with you.
                We&apos;re a small team focused on doing one thing well: supportive, structured
                conversations that respect your pace and your privacy.
              </p>
            </section>

            <div className="mt-16 grid sm:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 h-fit">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Structured, not robotic</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conversations follow evidence-informed frameworks while staying natural and adaptive.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 h-fit">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Supportive, not authoritative</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We don&apos;t diagnose or prescribe—we listen, reflect, and help you clarify your own goals.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 h-fit">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Built for your journey</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Session summaries and optional referrals connect your progress to your care team when you choose.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 h-fit">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Transparent and safe</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We prioritize privacy, clear boundaries, and user control over data and experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
