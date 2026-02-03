/**
 * Harvest config: agent_slug -> search queries and allowlisted domains.
 * Fewer, higher-value queries per agent to stay under Brave API request budget.
 */

export type AgentHarvestConfig = {
  searchQueries: string[];
  allowlistedDomains: string[];
  /** Optional keywords for scoring/filtering (e.g. handout, worksheet, guide) */
  keywords?: string[];
};

/** Map agent id (slug) -> harvest config. */
export const HARVEST_CONFIG: Record<string, AgentHarvestConfig> = {
  sleep_insomnia: {
    searchQueries: [
      'sleep hygiene handout site:.gov',
      'insomnia CBT worksheet site:.edu',
      'sleep wind-down routine guide',
    ],
    allowlistedDomains: [
      'nih.gov',
      'cdc.gov',
      'sleepfoundation.org',
      'mayoclinic.org',
      'health.harvard.edu',
      'apa.org',
    ],
    keywords: ['handout', 'worksheet', 'guide', 'fact sheet', 'sleep hygiene'],
  },
  anxiety_panic: {
    searchQueries: [
      'anxiety coping handout site:.gov',
      'panic disorder self-help site:.edu',
      'grounding techniques worksheet',
    ],
    allowlistedDomains: [
      'nimh.nih.gov',
      'adaa.org',
      'apa.org',
      'mayoclinic.org',
      'health.harvard.edu',
    ],
    keywords: ['handout', 'worksheet', 'guide', 'fact sheet', 'coping'],
  },
  addiction_support: {
    searchQueries: [
      'addiction recovery handout site:.gov',
      'cravings coping worksheet site:.edu',
      'addiction recovery coping skills guide',
    ],
    allowlistedDomains: ['samhsa.gov', 'niaaa.nih.gov', 'drugabuse.gov', 'aa.org'],
    keywords: ['handout', 'worksheet', 'guide', 'recovery'],
  },
  depression_mood: {
    searchQueries: [
      'depression self-help handout site:.gov',
      'behavioral activation worksheet site:.edu',
      'depression self-help behavioral activation guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'apa.org', 'mayoclinic.org'],
    keywords: ['handout', 'worksheet', 'guide', 'behavioral activation'],
  },
  adhd_executive: {
    searchQueries: [
      'ADHD executive function handout site:.gov',
      'task planning worksheet site:.edu',
      'ADHD task planning executive function tips',
    ],
    allowlistedDomains: ['chadd.org', 'additudemag.com', 'nimh.nih.gov'],
    keywords: ['handout', 'worksheet', 'guide', 'planning'],
  },
  anger_emotion_regulation: {
    searchQueries: [
      'anger management handout site:.gov',
      'emotion regulation worksheet site:.edu',
      'anger triggers coping skills guide',
    ],
    allowlistedDomains: ['apa.org', 'nimh.nih.gov', 'mayoclinic.org'],
    keywords: ['handout', 'worksheet', 'emotion regulation'],
  },
  boundaries_assertiveness: {
    searchQueries: [
      'boundaries assertiveness handout site:.gov',
      'saying no worksheet site:.edu',
      'assertive communication guide',
    ],
    allowlistedDomains: ['apa.org', 'mayoclinic.org', 'psychologytoday.com'],
    keywords: ['boundaries', 'assertiveness', 'communication'],
  },
  chronic_illness: {
    searchQueries: [
      'chronic illness coping handout site:.gov',
      'chronic disease self-management site:.edu',
      'chronic illness emotional coping guide',
    ],
    allowlistedDomains: ['cdc.gov', 'nih.gov', 'mayoclinic.org'],
    keywords: ['coping', 'self-management', 'adjustment'],
  },
  communication_skills: {
    searchQueries: [
      'active listening handout site:.gov',
      'assertive communication worksheet site:.edu',
      'communication skills guide',
    ],
    allowlistedDomains: ['apa.org', 'mayoclinic.org', 'mindtools.com'],
    keywords: ['listening', 'assertiveness', 'communication'],
  },
  eating_body_image: {
    searchQueries: [
      'body image self-compassion handout site:.gov',
      'eating disorder support resources site:.edu',
      'body image self-compassion guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'nedc.com.au', 'nationaleatingdisorders.org'],
    keywords: ['self-compassion', 'body image', 'support'],
  },
  family_communication: {
    searchQueries: [
      'family communication handout site:.gov',
      'family boundaries worksheet site:.edu',
      'family communication guide',
    ],
    allowlistedDomains: ['apa.org', 'aamft.org', 'psychologytoday.com'],
    keywords: ['family', 'communication', 'boundaries'],
  },
  general_reflection: {
    searchQueries: [
      'stress management handout site:.gov',
      'self-reflection journaling site:.edu',
      'stress management self-reflection guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'apa.org', 'mayoclinic.org'],
    keywords: ['stress', 'reflection', 'journaling'],
  },
  grief_loss: {
    searchQueries: [
      'grief loss handout site:.gov',
      'grief coping worksheet site:.edu',
      'grief and loss coping guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'apa.org', 'whatsyourgrief.com'],
    keywords: ['grief', 'loss', 'coping'],
  },
  lgbtq_affirming: {
    searchQueries: [
      'LGBTQ mental health resources site:.gov',
      'LGBTQ affirming support site:.edu',
      'LGBTQ mental health affirming guide',
    ],
    allowlistedDomains: ['samhsa.gov', 'thetrevorproject.org', 'hrc.org'],
    keywords: ['LGBTQ', 'affirming', 'support'],
  },
  mens_mental_health: {
    searchQueries: [
      'mens mental health handout site:.gov',
      'men depression anxiety site:.edu',
      'mens mental health coping guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'apa.org', 'movember.com'],
    keywords: ['men', 'mental health', 'coping'],
  },
  mindfulness_meditation: {
    searchQueries: [
      'mindfulness meditation handout site:.gov',
      'mindfulness exercises site:.edu',
      'mindfulness meditation practice guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'apa.org', 'mindful.org'],
    keywords: ['mindfulness', 'meditation', 'grounding'],
  },
  motivation_habits: {
    searchQueries: [
      'habit building handout site:.gov',
      'motivation small steps site:.edu',
      'habit building motivation guide',
    ],
    allowlistedDomains: ['apa.org', 'psychologytoday.com'],
    keywords: ['habits', 'motivation', 'small steps'],
  },
  ocd_support: {
    searchQueries: [
      'OCD support handout site:.gov',
      'OCD self-help resources site:.edu',
      'OCD support coping guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'iocdf.org', 'adaa.org'],
    keywords: ['OCD', 'support', 'coping'],
  },
  relationship_communication: {
    searchQueries: [
      'couples communication handout site:.gov',
      'relationship conflict resolution site:.edu',
      'relationship communication guide',
    ],
    allowlistedDomains: ['apa.org', 'aamft.org', 'gotman.com'],
    keywords: ['couples', 'communication', 'conflict'],
  },
  self_esteem_compassion: {
    searchQueries: [
      'self-esteem self-compassion handout site:.gov',
      'self-compassion worksheet site:.edu',
      'self-compassion self-esteem guide',
    ],
    allowlistedDomains: ['apa.org', 'self-compassion.org', 'nimh.nih.gov'],
    keywords: ['self-esteem', 'self-compassion', 'inner critic'],
  },
  social_anxiety_confidence: {
    searchQueries: [
      'social anxiety handout site:.gov',
      'social anxiety self-help site:.edu',
      'social anxiety confidence guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'adaa.org', 'apa.org'],
    keywords: ['social anxiety', 'confidence', 'self-compassion'],
  },
  stress_burnout: {
    searchQueries: [
      'stress burnout handout site:.gov',
      'burnout recovery site:.edu',
      'stress burnout boundaries guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'apa.org', 'mayoclinic.org'],
    keywords: ['stress', 'burnout', 'boundaries'],
  },
  trauma_ptsd: {
    searchQueries: [
      'PTSD trauma handout site:.gov',
      'trauma grounding techniques site:.edu',
      'trauma-informed grounding guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'ptsd.va.gov', 'apa.org'],
    keywords: ['trauma', 'grounding', 'safety'],
  },
  womens_mental_health: {
    searchQueries: [
      'womens mental health handout site:.gov',
      'women stress self-care site:.edu',
      'womens mental health self-care guide',
    ],
    allowlistedDomains: ['nimh.nih.gov', 'womenshealth.gov', 'apa.org'],
    keywords: ['women', 'self-care', 'stress'],
  },
  work_career: {
    searchQueries: [
      'work stress boundaries handout site:.gov',
      'career stress management site:.edu',
      'work stress boundaries guide',
    ],
    allowlistedDomains: ['apa.org', 'cdc.gov', 'mindtools.com'],
    keywords: ['work stress', 'boundaries', 'career'],
  },
};

export function getHarvestConfig(agentSlug: string): AgentHarvestConfig | undefined {
  return HARVEST_CONFIG[agentSlug];
}

export function getHarvestConfigAgentSlugs(): string[] {
  return Object.keys(HARVEST_CONFIG);
}
