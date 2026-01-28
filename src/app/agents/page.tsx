import { getAgents } from '@/lib/agents';
import AgentCard from '@/components/AgentCard';
import Link from 'next/link';

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Available Agents</h1>
          <p className="text-gray-600 mt-2">
            Select an agent to start a voice session
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
