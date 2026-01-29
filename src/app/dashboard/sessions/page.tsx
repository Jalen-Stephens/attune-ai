import { listSessions } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import SessionsTable from './SessionsTable';

export default async function SessionsPage() {
  const sessions = await listSessions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground mt-2">
          View your past voice sessions and summaries
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Start a voice session with an agent to see your conversations here.
            </p>
            <Button asChild>
              <Link href="/agents">Browse Agents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsTable sessions={sessions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
