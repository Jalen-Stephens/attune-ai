import { listSessions } from '@/lib/db';
import SessionCard from '@/components/SessionCard';
import Link from 'next/link';

export default async function SessionsPage() {
  const sessions = await listSessions();

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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Sessions</h1>
          <p className="text-gray-600 mt-2">
            View your past voice sessions and summaries
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No sessions yet.</p>
            <Link
              href="/agents"
              className="text-blue-600 hover:text-blue-800 mt-4 inline-block"
            >
              Start a session with an agent →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
