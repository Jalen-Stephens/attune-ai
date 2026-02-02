import { getSessionDetail, getIntake, getReferrals, getSuggestionsForSession, getSessionTimeline, getSessionResources } from '@/lib/db';
import SessionTimelineViewer from '@/components/SessionTimelineViewer';
import ResourcesTabContent from '@/components/ResourcesTabContent';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GenerateSummaryButton from './GenerateSummaryButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, MessageSquare, FileText, UserCheck, ArrowRight, BookOpen } from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  
  let sessionData, intake, referrals, timeline, sessionResources;
  try {
    [sessionData, intake, referrals, timeline, sessionResources] = await Promise.all([
      getSessionDetail(sessionId),
      getIntake(sessionId),
      getReferrals(sessionId),
      getSessionTimeline(sessionId),
      getSessionResources(sessionId),
    ]);
  } catch (error) {
    notFound();
  }

  const { session, transcript, summary, userDisplayName } = sessionData;

  let suggestions: Awaited<ReturnType<typeof getSuggestionsForSession>> = [];
  try {
    suggestions = await getSuggestionsForSession(sessionId);
  } catch {
    // Suggestions are optional for display; don't 404 the page
  }

  // Group suggestions by turn_id for transcript icons
  const suggestionsByTurnId: Record<string, { kind: 'resource' | 'agent'; payload: unknown }[]> = {};
  for (const s of suggestions) {
    if (!suggestionsByTurnId[s.turn_id]) suggestionsByTurnId[s.turn_id] = [];
    suggestionsByTurnId[s.turn_id].push({ kind: s.kind, payload: s.payload });
  }

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

      {/* Quick Actions */}
      {(intake || referrals.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {intake && (
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Screening Summary
                </CardTitle>
                <CardDescription>
                  View what we collected during your conversation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/sessions/${sessionId}/screening`}>
                    View Screening
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {referrals.length > 0 && (
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Specialist Referrals
                </CardTitle>
                <CardDescription>
                  {referrals.length} {referrals.length === 1 ? 'specialist' : 'specialists'} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="default" className="w-full">
                  <Link href={`/referrals/${sessionId}`}>
                    View Referrals
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Resources
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
                Messages and resources shared during the session, in order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionTimelineViewer
                items={timeline}
                userDisplayName={userDisplayName}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resources Provided</CardTitle>
              <CardDescription>
                All providers and resources shared with you during this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionResources.length > 0 ? (
                <ResourcesTabContent items={sessionResources} />
              ) : (
                <div className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No resources were shared during this session.
                  </p>
                </div>
              )}
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
