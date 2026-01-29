'use client';

import { SuggestedAgents, type SuggestedAgentItem } from './SuggestedAgents';
import { SuggestedResources, type SuggestedResourceItem } from './SuggestedResources';
import { cn } from '@/lib/utils';

export interface AssistantResponseData {
  assistant_message: string;
  clarifying_question?: string;
  suggested_agents: SuggestedAgentItem[];
  suggested_resources: SuggestedResourceItem[];
  quick_plan?: string[];
  breathing_prompt?: string;
  safety?: { is_crisis: boolean; message: string };
}

export interface AssistantResponseProps {
  data: AssistantResponseData;
  className?: string;
  /** Start voice with suggested agent in-dashboard (no navigation) */
  onStartVoice?: (agentId: string, agentName: string) => void;
  voiceActive?: boolean;
  voiceConnecting?: boolean;
  voiceReady?: boolean;
}

export function AssistantResponse({
  data,
  className,
  onStartVoice,
  voiceActive = false,
  voiceConnecting = false,
  voiceReady = true,
}: AssistantResponseProps) {
  const {
    assistant_message,
    clarifying_question,
    suggested_agents,
    suggested_resources,
    quick_plan,
    breathing_prompt,
    safety,
  } = data;

  const isCrisis = safety?.is_crisis ?? false;

  return (
    <div className={cn('space-y-5 text-sm', className)}>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-foreground whitespace-pre-wrap">{assistant_message}</p>
        {clarifying_question && (
          <p className="text-muted-foreground mt-2 italic">{clarifying_question}</p>
        )}
      </div>

      {isCrisis && (
        <div
          className="rounded-xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-4"
          role="alert"
        >
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            If you're in crisis, please reach out for help.
          </p>
          <p className="text-amber-700 dark:text-amber-300 mt-1 text-xs">
            Call or text 988 (US) for the Suicide & Crisis Lifeline, 24/7.
          </p>
        </div>
      )}

      {!isCrisis && suggested_agents.length > 0 && (
        <SuggestedAgents
          agents={suggested_agents}
          onStartVoice={onStartVoice}
          voiceActive={voiceActive}
          voiceConnecting={voiceConnecting}
          voiceReady={voiceReady}
        />
      )}

      {!isCrisis && suggested_resources.length > 0 && (
        <SuggestedResources resources={suggested_resources} />
      )}

      {!isCrisis && (quick_plan?.length ?? 0) > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Try this now</h3>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {quick_plan!.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {!isCrisis && breathing_prompt && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground">{breathing_prompt}</p>
        </div>
      )}
    </div>
  );
}
