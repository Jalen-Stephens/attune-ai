import { getSessionDetail } from '@/lib/db';
import TranscriptViewer from '@/components/TranscriptViewer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GenerateSummaryButton from './GenerateSummaryButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, MessageSquare, FileText } from 'lucide-react';

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const started = formatDateTime(session.started_at);
  const ended = session.ended_at ? formatDateTime(session.ended_at) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/sessions">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Session Details</h1>
          <p className="text-muted-foreground">
            {session.agent?.name || 'Unknown Agent'}
          </p>
        </div>
        <Badge variant={session.status === 'active' ? 'success' : 'secondary'}>
          {session.status}
        </Badge>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Agent
                </div>
                <div className="text-base font-medium">
                  {session.agent?.name || 'Unknown'}
                </div>
                {session.agent?.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {session.agent.description}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Started
                </div>
                <div className="text-base font-medium">{started.date}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {started.time}
                </div>
              </div>
              {ended && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ended
                  </div>
                  <div className="text-base font-medium">{ended.date}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {ended.time}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="transcript" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Transcript</CardTitle>
              <CardDescription>
                {transcript.length} {transcript.length === 1 ? 'message' : 'messages'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TranscriptViewer turns={transcript} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Session Summary</CardTitle>
                  <CardDescription>
                    AI-generated summary of the conversation
                  </CardDescription>
                </div>
                {!summary && (
                  <GenerateSummaryButton sessionId={sessionId} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {summary.summary_text}
                    </p>
                  </div>
                  {summary.summary_json && (
                    <details className="rounded-lg bg-muted p-4">
                      <summary className="cursor-pointer font-semibold text-sm mb-3 hover:text-foreground">
                        Structured Summary (JSON)
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto bg-background p-3 rounded border">
                        {JSON.stringify(summary.summary_json, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No summary available</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                    Generate an AI summary to get insights from this conversation.
                  </p>
                  <GenerateSummaryButton sessionId={sessionId} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
