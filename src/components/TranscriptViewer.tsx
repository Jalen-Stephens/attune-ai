import type { TranscriptTurn } from '@/lib/types';

interface TranscriptViewerProps {
  turns: TranscriptTurn[];
}

export default function TranscriptViewer({ turns }: TranscriptViewerProps) {
  if (turns.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No transcript available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={`p-4 rounded-lg ${
            turn.role === 'user'
              ? 'bg-blue-50 ml-8'
              : 'bg-gray-50 mr-8'
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                turn.role === 'user'
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {turn.role}
            </span>
            <p className="flex-1 text-gray-900">{turn.text}</p>
          </div>
          {turn.timestamp && (
            <p className="text-xs text-gray-500 mt-2 ml-20">
              {new Date(turn.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
