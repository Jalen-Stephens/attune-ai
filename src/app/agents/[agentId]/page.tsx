import { getAgentById } from '@/lib/agents';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StartSessionButton from './StartSessionButton';

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { agentId } = await params;
  const agent = await getAgentById(agentId);

  if (!agent) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/agents"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Agents
        </Link>

        <div className="bg-white rounded-lg border border-gray-200 p-8 mt-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{agent.name}</h1>
          <p className="text-lg text-gray-700 mb-6">{agent.description}</p>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              System Prompt
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {agent.system_prompt}
              </p>
            </div>
          </div>

          {agent.intake_questions && agent.intake_questions.length > 0 && (
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Intake Questions
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {agent.intake_questions.map((question, idx) => (
                  <li key={idx}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <StartSessionButton agentId={agent.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
