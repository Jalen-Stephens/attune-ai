import type { TranscriptTurn } from '@/lib/types';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Clock, BookOpen, UserCircle } from 'lucide-react';

export type SuggestionsByTurnId = Record<
  string,
  { kind: 'resource' | 'agent'; payload: unknown }[]
>;

interface TranscriptViewerProps {
  turns: TranscriptTurn[];
  userDisplayName?: string | null;
  suggestionsByTurnId?: SuggestionsByTurnId;
}

export default function TranscriptViewer({
  turns,
  userDisplayName,
  suggestionsByTurnId = {},
}: TranscriptViewerProps) {
  if (turns.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No transcript available yet.</p>
      </div>
    );
  }

  const labelForRole = (role: 'user' | 'assistant') =>
    role === 'user' ? (userDisplayName?.trim() || 'user') : role;

  return (
    <div className="space-y-4">
      {turns.map((turn) => {
        const isUser = turn.role === 'user';
        const suggestions = suggestionsByTurnId[turn.id] ?? [];
        const hasResources = suggestions.some((s) => s.kind === 'resource');
        const hasAgents = suggestions.some((s) => s.kind === 'agent');
        return (
          <div
            key={turn.id}
            className={cn(
              'flex gap-4',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'flex-1 rounded-lg border p-4 space-y-2',
                isUser
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-muted/50 border-border'
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={isUser ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {labelForRole(turn.role)}
                </Badge>
                {turn.timestamp && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(turn.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {!isUser && (hasResources || hasAgents) && (
                  <span className="flex items-center gap-1.5 text-muted-foreground" title="Suggested resources or agents">
                    {hasResources && (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs" title="Suggested resources">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Resources</span>
                      </span>
                    )}
                    {hasAgents && (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs" title="Suggested agents">
                        <UserCircle className="h-3.5 w-3.5" />
                        <span>Agents</span>
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed">{turn.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
