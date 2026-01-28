import { listSessions } from '@/lib/db';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar, Clock } from 'lucide-react';

export default async function SessionsPage() {
  const sessions = await listSessions();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Started</TableHead>
                    <TableHead className="hidden lg:table-cell">Ended</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow 
                      key={session.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/dashboard/sessions/${session.id}`}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {session.agent?.name || 'Unknown Agent'}
                        </div>
                        {session.agent?.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {session.agent.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={session.status === 'active' ? 'success' : 'secondary'}
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(session.started_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(session.started_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {session.ended_at ? (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(session.ended_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(session.ended_at)}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/dashboard/sessions/${session.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
