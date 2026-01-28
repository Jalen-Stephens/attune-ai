import Link from 'next/link';
import type { AgentProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface AgentCardProps {
  agent: AgentProfile;
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.id}`} className="block h-full">
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group">
        <CardHeader>
          <CardTitle className="group-hover:text-primary transition-colors">
            {agent.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
            View details
            <ArrowRight className="h-4 w-4 ml-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
