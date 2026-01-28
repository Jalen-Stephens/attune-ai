import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Attune AI</h1>
          <p className="text-xl text-gray-600">
            Voice- and text-based AI support platform with specialized agents
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link
            href="/agents"
            className="p-8 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-center"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Browse Agents
            </h2>
            <p className="text-gray-600">
              Explore specialized AI agents designed for different support domains
            </p>
          </Link>

          <Link
            href="/dashboard/sessions"
            className="p-8 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-center"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              View Sessions
            </h2>
            <p className="text-gray-600">
              Review past voice sessions, transcripts, and summaries
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
