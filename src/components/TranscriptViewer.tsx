import type { TranscriptTurn } from '@/lib/types';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TranscriptViewerProps {
  turns: TranscriptTurn[];
}

export default function TranscriptViewer({ turns }: TranscriptViewerProps) {
  if (turns.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No transcript available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {turns.map((turn) => {
        const isUser = turn.role === 'user';
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
              <div className="flex items-center gap-2">
                <Badge
                  variant={isUser ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {turn.role}
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
              </div>
              <p className="text-sm leading-relaxed">{turn.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
