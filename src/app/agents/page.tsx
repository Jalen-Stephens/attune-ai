import { getAgents } from '@/lib/agents';
import { AgentsListClient } from './AgentsListClient';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted-foreground mt-2">
          Select an agent to start a voice session
        </p>
      </div>

      <AgentsListClient agents={agents} />
    </div>
  );
}
