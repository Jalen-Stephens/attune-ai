import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AgentTagBadgeProps {
  tag: string;
  className?: string;
}

export function AgentTagBadge({ tag, className }: AgentTagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-normal text-xs shrink-0',
        className
      )}
    >
      {tag}
    </Badge>
  );
}
