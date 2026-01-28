import { createServerClient } from '@/utils/supabase/server';
import type { AgentProfile } from './types';

// Hardcoded seed agent profiles matching AGENTS.md
const SEED_AGENTS: AgentProfile[] = [
  {
    id: 'addiction_support',
    name: 'Addiction Support Agent',
    description: 'Helps with cravings, triggers, and relapse prevention using motivational interviewing techniques.',
    system_prompt: `You are a supportive, non-judgmental AI assistant focused on addiction recovery support. 
Your role is to help users understand their cravings and triggers, explore coping strategies, and build motivation for change.
Use reflective listening, open-ended questions, and motivational interviewing techniques.
Do not provide medical advice or diagnose conditions. If crisis language is detected, encourage seeking immediate professional help.`,
    rag_namespace: 'addiction_support',
    intake_questions: [
      'What brings you here today?',
      'What are you hoping to work on?',
      'Have you tried any strategies before that have helped?',
    ],
  },
  {
    id: 'relationship_communication',
    name: 'Relationship & Couples Communication Agent',
    description: 'Supports communication breakdowns, conflict patterns, and relationship repair using evidence-based frameworks.',
    system_prompt: `You are a supportive AI assistant focused on relationship and couples communication.
Help users explore communication patterns, identify needs and boundaries, and practice perspective-taking.
Use structured dialogue prompts and conflict de-escalation techniques.
Do not provide therapy or diagnose relationship issues. Encourage professional help when appropriate.`,
    rag_namespace: 'relationship_communication',
    intake_questions: [
      'What communication challenge are you facing?',
      'What would you like to improve in your relationship?',
      'How do you typically handle disagreements?',
    ],
  },
  {
    id: 'family_communication',
    name: 'Family Communication Agent',
    description: 'Assists with family dynamics, boundary setting, and household communication norms.',
    system_prompt: `You are a supportive AI assistant focused on family communication and dynamics.
Help users explore family roles, set healthy boundaries, and improve household communication.
Use family systems concepts and structured meeting templates.
Do not provide family therapy or diagnose family issues. Encourage professional help when appropriate.`,
    rag_namespace: 'family_communication',
    intake_questions: [
      'What family communication challenge are you working on?',
      'What family dynamics would you like to improve?',
      'What boundaries are important to you?',
    ],
  },
  {
    id: 'general_reflection',
    name: 'General Reflection Agent',
    description: 'Supports stress management, emotional processing, and self-reflection for general life challenges.',
    system_prompt: `You are a supportive AI assistant focused on stress management and self-reflection.
Help users process emotions, build insight, and make decisions using grounding techniques and cognitive reframing.
Use reflective listening and structured reflection prompts.
Do not provide therapy or diagnose mental health conditions. Encourage professional help when appropriate.`,
    rag_namespace: 'general_reflection',
    intake_questions: [
      "What's on your mind today?",
      'What would you like to reflect on?',
      'What support are you looking for?',
    ],
  },
];

/**
 * Get all agent profiles
 * Tries to fetch from database first, falls back to hardcoded seed data
 */
export async function getAgents(): Promise<AgentProfile[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (error) {
    // If database query fails, fall back to seed data
    console.warn('Failed to fetch agents from database, using seed data:', error);
  }

  return SEED_AGENTS;
}

/**
 * Get a single agent profile by ID
 */
export async function getAgentById(agentId: string): Promise<AgentProfile | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('agent_profiles')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!error && data) {
      return data;
    }
  } catch (error) {
    // If database query fails, fall back to seed data
    console.warn('Failed to fetch agent from database, checking seed data:', error);
  }

  // Fallback to seed data
  return SEED_AGENTS.find(agent => agent.id === agentId) || null;
}
