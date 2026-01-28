import Link from 'next/link';
import type { Session } from '@/lib/types';

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  const date = new Date(session.started_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      href={`/dashboard/sessions/${session.id}`}
      className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {session.agent?.name || 'Unknown Agent'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{date}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            session.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {session.status}
        </span>
      </div>
      {session.agent?.description && (
        <p className="text-sm text-gray-600 mt-2">{session.agent.description}</p>
      )}
    </Link>
  );
}
