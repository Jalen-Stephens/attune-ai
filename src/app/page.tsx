import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, LayoutDashboard, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Attune AI</h1>
        <p className="text-xl text-muted-foreground">
          Voice- and text-based AI support platform with specialized agents
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/agents" className="block h-full">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  Browse Agents
                </CardTitle>
              </div>
              <CardDescription>
                Explore specialized AI agents designed for different support domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="group-hover:text-primary">
                Get started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sessions" className="block h-full">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  View Sessions
                </CardTitle>
              </div>
              <CardDescription>
                Review past voice sessions, transcripts, and summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="group-hover:text-primary">
                View sessions
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
