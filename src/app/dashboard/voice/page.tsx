import type { Metadata } from 'next';
import Link from 'next/link';
import { getAgentById } from '@/lib/agents';
import { VapiVoiceWidget } from '@/components/voice/VapiVoiceWidget';
import { Button } from '@/components/ui/button';
import { Mic, Headphones, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Voice Call | Attune AI',
  description: 'Start a voice call with an assistant. Use the widget to connect and see the live transcript.',
};

interface DashboardVoicePageProps {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}

export default async function DashboardVoicePage({ searchParams }: DashboardVoicePageProps) {
  const params = await searchParams;
  const agentId = typeof params.agentId === 'string' ? params.agentId : undefined;
  const agent = agentId ? await getAgentById(agentId) : null;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        {agent && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/agents/${agent.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {agent.name}
            </Link>
          </Button>
        )}
        {!agent && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        )}

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Mic className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {agent ? `Voice call with ${agent.name}` : 'Voice call'}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {agent
                ? `Start a call with ${agent.name}. Use the widget to connect.`
                : 'Use the widget to start a call and see the live transcript.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 max-w-2xl">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Use the floating widget at the bottom-right to <strong className="text-foreground">Start</strong> a call.</li>
            <li>Grant microphone access when prompted.</li>
            <li>Speak with the assistant; the live transcript appears in the widget.</li>
            <li>Click <strong className="text-foreground">Stop</strong> to end the call, or <strong className="text-foreground">Clear transcript</strong> to reset.</li>
          </ol>
        </div>
      </div>

      <VapiVoiceWidget agentId={agent?.id} agentName={agent?.name} />
    </div>
  );
}
