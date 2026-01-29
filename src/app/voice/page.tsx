import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/Container';
import { VapiVoiceWidget } from '@/components/voice/VapiVoiceWidget';
import Link from 'next/link';
import { getAgentById } from '@/lib/agents';
import { Button } from '@/components/ui/button';
import { Mic, Headphones, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Voice Call | Attune AI',
  description: 'Start a voice call with an assistant. Use the widget to connect and see the live transcript.',
};

interface VoicePageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}

export default async function VoiceDemoPage({ searchParams }: VoicePageProps) {
  const params = await searchParams;
  const agentId = typeof params.agentId === 'string' ? params.agentId : undefined;
  const agent = agentId ? await getAgentById(agentId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-2xl mx-auto space-y-8">
            {agent && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/agents/${agent.id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to {agent.name}
                </Link>
              </Button>
            )}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Mic className="h-8 w-8 text-primary" aria-hidden />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {agent ? `Voice call with ${agent.name}` : 'Voice call'}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {agent
                    ? `Start a call with ${agent.name}. Use the widget to connect.`
                    : 'Web SDK voice interface with live transcript'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Instructions
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Ensure <code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_VAPI_PUBLIC_KEY</code> and <code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_VAPI_ASSISTANT_ID</code> are set in <code className="rounded bg-muted px-1.5 py-0.5">.env</code>.</li>
                <li>Use the floating widget at the bottom-right to <strong className="text-foreground">Start</strong> a call.</li>
                <li>Grant microphone access when prompted.</li>
                <li>Speak with the assistant; the live transcript appears in the widget.</li>
                <li>Click <strong className="text-foreground">Stop</strong> to end the call, or <strong className="text-foreground">Clear transcript</strong> to reset.</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                See <code className="rounded bg-muted px-1.5 py-0.5">docs/VAPI_WEB_SDK.md</code> in the repo for setup, troubleshooting, and event details.
              </p>
            </div>
          </div>
        </Container>
      </main>

      <Footer />

      <VapiVoiceWidget agentId={agent?.id} agentName={agent?.name} />
    </div>
  );
}
