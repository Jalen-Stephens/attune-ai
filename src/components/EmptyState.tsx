import { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        {icon && <div className="mb-4 text-muted-foreground flex-shrink-0">{icon}</div>}
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm text-sm">
          {description}
        </p>
        {action && (
          <Button
            variant="default"
            onClick={action.onClick}
            asChild={!!action.href}
            className="w-full sm:w-auto"
          >
            {action.href ? <a href={action.href}>{action.label}</a> : action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
