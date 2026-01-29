import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, LayoutDashboard, UserCheck, ArrowRight } from 'lucide-react';

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Manage your conversations, screenings, and specialist referrals
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/dashboard/sessions" className="block h-full">
          <Card className="h-full transition-all hover:border-primary/50 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  Conversations
                </CardTitle>
              </div>
              <CardDescription>
                Review past voice sessions, transcripts, and summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="group-hover:text-primary">
                View conversations
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/referrals" className="block h-full">
          <Card className="h-full transition-all hover:border-primary/50 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  Referrals
                </CardTitle>
              </div>
              <CardDescription>
                View your specialist referrals and booking options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="group-hover:text-primary">
                View referrals
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agents" className="block h-full">
          <Card className="h-full transition-all hover:border-primary/50 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  Browse Agents
                </CardTitle>
              </div>
              <CardDescription>
                Start a new conversation with a specialized AI agent
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
      </div>
    </div>
  );
}
