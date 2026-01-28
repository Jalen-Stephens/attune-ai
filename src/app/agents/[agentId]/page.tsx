import { getAgentById } from '@/lib/agents';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StartSessionButton from './StartSessionButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, HelpCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { agentId } = await params;
  const agent = await getAgentById(agentId);

  if (!agent) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agents">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agents
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground text-lg">{agent.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            System Prompt
          </TabsTrigger>
          {agent.intake_questions && agent.intake_questions.length > 0 && (
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Intake Questions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About this Agent</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Agent ID
                  </div>
                  <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md inline-block">
                    {agent.id}
                  </div>
                </div>
                {agent.rag_namespace && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      RAG Namespace
                    </div>
                    <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md inline-block">
                      {agent.rag_namespace}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Start a Session</CardTitle>
              <CardDescription>
                Begin a voice conversation with this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StartSessionButton agentId={agent.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>
                The instructions that guide this agent's behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {agent.system_prompt}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {agent.intake_questions && agent.intake_questions.length > 0 && (
          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Intake Questions</CardTitle>
                <CardDescription>
                  Questions this agent may ask at the start of a session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-3">
                  {agent.intake_questions.map((question, idx) => (
                    <li key={idx} className="text-sm leading-relaxed">
                      {question}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
