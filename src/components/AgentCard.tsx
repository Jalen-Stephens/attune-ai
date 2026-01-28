import Link from 'next/link';
import type { AgentProfile } from '@/lib/types';

interface AgentCardProps {
  agent: AgentProfile;
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-shadow"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{agent.name}</h3>
      <p className="text-gray-600">{agent.description}</p>
    </Link>
  );
}
