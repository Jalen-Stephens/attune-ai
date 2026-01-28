import { getSessionDetail } from '@/lib/db';
import TranscriptViewer from '@/components/TranscriptViewer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GenerateSummaryButton from './GenerateSummaryButton';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  
  let sessionData;
  try {
    sessionData = await getSessionDetail(sessionId);
  } catch (error) {
    notFound();
  }

  const { session, transcript, summary } = sessionData;

  const startedDate = new Date(session.started_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const endedDate = session.ended_at
    ? new Date(session.ended_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/sessions"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Sessions
        </Link>

        <div className="bg-white rounded-lg border border-gray-200 p-8 mt-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Session Details
            </h1>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Agent:</span>
                <span className="ml-2 text-gray-900">
                  {session.agent?.name || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    session.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Started:</span>
                <span className="ml-2 text-gray-900">{startedDate}</span>
              </div>
              {endedDate && (
                <div>
                  <span className="font-semibold text-gray-700">Ended:</span>
                  <span className="ml-2 text-gray-900">{endedDate}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Transcript
            </h2>
            <TranscriptViewer turns={transcript} />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Summary</h2>
              {!summary && (
                <GenerateSummaryButton sessionId={sessionId} />
              )}
            </div>
            {summary ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {summary.summary_text}
                  </p>
                </div>
                {summary.summary_json && (
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                      Structured Summary (JSON)
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {JSON.stringify(summary.summary_json, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">No summary available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
