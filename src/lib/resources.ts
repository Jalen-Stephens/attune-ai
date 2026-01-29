/**
 * Static resource catalog for dashboard recommendations.
 * Used when no documents table / RAG is available. Add new entries here or
 * wire retrieveResources to a DB/vector search later.
 */
export interface ResourceItem {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  /** External URL or internal path for "Open" */
  url?: string;
  /** Markdown body for in-app preview when no URL */
  body?: string;
  type: 'handout' | 'article' | 'exercise' | 'guide';
  /** Keywords for heuristic scoring against user query */
  keywords: string[];
}

export const RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    slug: 'box-breathing',
    title: 'Box Breathing (4-4-4-4)',
    snippet: 'A simple breathing exercise to calm the nervous system. Breathe in for 4, hold for 4, out for 4, hold for 4.',
    type: 'exercise',
    keywords: ['breathing', 'calm', 'anxiety', 'stress', 'grounding', 'panic', 'relax'],
  },
  {
    id: 'res-2',
    slug: '5-4-3-2-1-grounding',
    title: '5-4-3-2-1 Grounding',
    snippet: 'Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste. Helps bring you back to the present.',
    type: 'exercise',
    keywords: ['grounding', 'anxiety', 'panic', 'present', 'dissociation', 'trauma'],
  },
  {
    id: 'res-3',
    slug: 'craving-delay-strategies',
    title: 'Craving Delay Strategies',
    snippet: 'Practical steps to ride out a craving: delay, distract, discuss. Not a substitute for treatment.',
    type: 'handout',
    keywords: ['craving', 'addiction', 'recovery', 'triggers', 'relapse'],
  },
  {
    id: 'res-4',
    slug: 'sleep-hygiene-basics',
    title: 'Sleep Hygiene Basics',
    snippet: 'Wind-down routines, light and screen use, and simple habits that support better sleep.',
    type: 'guide',
    keywords: ['sleep', 'insomnia', 'racing thoughts', 'wind down', 'rest'],
  },
  {
    id: 'res-5',
    slug: 'assertiveness-script',
    title: 'A Simple Assertiveness Script',
    snippet: 'How to say what you need clearly: "When X happens, I feel Y. I’d like Z." Practice with low-stakes situations first.',
    type: 'handout',
    keywords: ['boundaries', 'assertiveness', 'communication', 'say no', 'conflict', 'partner', 'relationship'],
  },
  {
    id: 'res-6',
    slug: 'behavioral-activation',
    title: 'Small Steps: Behavioral Activation',
    snippet: 'Reconnect with activities that matter. Start with one small, doable action and build from there.',
    type: 'guide',
    keywords: ['motivation', 'depression', 'mood', 'low energy', 'overwhelm', 'adhd'],
  },
  {
    id: 'res-7',
    slug: 'self-compassion-break',
    title: 'Self-Compassion Break',
    snippet: 'Pause and offer yourself the same kindness you’d offer a friend: "This is hard. I’m here for myself."',
    type: 'exercise',
    keywords: ['self-compassion', 'self-criticism', 'shame', 'kindness', 'ocd', 'mood'],
  },
  {
    id: 'res-8',
    slug: 'conflict-de-escalation',
    title: 'Conflict De-escalation',
    snippet: 'Take a break, soften startup, and listen before responding. Tips for heated moments with a partner or family.',
    type: 'handout',
    keywords: ['conflict', 'fight', 'partner', 'relationship', 'family', 'communication', 'anger'],
  },
  {
    id: 'res-9',
    slug: 'stress-and-boundaries',
    title: 'Stress and Boundaries',
    snippet: 'When to say no, how to protect rest, and why boundaries are part of sustainable pacing.',
    type: 'article',
    keywords: ['stress', 'burnout', 'boundaries', 'overwhelm', 'work', 'rest'],
  },
  {
    id: 'res-10',
    slug: 'grief-and-pacing',
    title: 'Grief and Pacing',
    snippet: 'There’s no right timeline. Honoring your pace and finding small ways to care for yourself.',
    type: 'guide',
    keywords: ['grief', 'loss', 'bereavement', 'sadness', 'pace'],
  },
  {
    id: 'res-11',
    slug: 'task-breakdown',
    title: 'Breaking Down Tasks',
    snippet: 'Turn "I have to do X" into one tiny first step. Helpful when planning feels overwhelming.',
    type: 'handout',
    keywords: ['overwhelm', 'adhd', 'planning', 'focus', 'task', 'procrastination'],
  },
  {
    id: 'res-12',
    slug: 'anger-pause',
    title: 'The Pause Before Reacting',
    snippet: 'Notice anger in your body, name it, then choose how to respond. A short script for heated moments.',
    type: 'exercise',
    keywords: ['anger', 'frustration', 'trigger', 'regulation', 'emotion'],
  },
  {
    id: 'res-13',
    slug: 'mindfulness-minute',
    title: 'One-Minute Mindfulness',
    snippet: 'A 60-second practice: notice your breath and surroundings without judging. Good for stress and rumination.',
    type: 'exercise',
    keywords: ['mindfulness', 'stress', 'rumination', 'present', 'meditation'],
  },
  {
    id: 'res-14',
    slug: '988-crisis-resources',
    title: '988 Suicide & Crisis Lifeline',
    snippet: 'Call or text 988 in the US for free, confidential support 24/7. You don’t have to be in crisis to reach out.',
    type: 'guide',
    keywords: ['crisis', 'emergency', 'help', '988', 'support', 'suicide', 'self-harm'],
  },
  {
    id: 'res-15',
    slug: 'habit-stacking',
    title: 'Habit Stacking',
    snippet: 'Attach a new habit to an existing one: "After I pour coffee, I’ll do one small thing."',
    type: 'guide',
    keywords: ['habits', 'motivation', 'routine', 'goals', 'behavior', 'adhd'],
  },
];
