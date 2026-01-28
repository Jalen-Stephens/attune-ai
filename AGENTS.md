# Attune AI – Agent Architecture & Design

## Overview
Attune AI is built as an **agent-based system**, where each agent represents a specialized conversational persona with shared core capabilities and domain-specific behaviors.

Agents are not independent models; they are configurations composed of:
- A system prompt
- Behavioral constraints
- A scoped retrieval corpus (RAG)
- Shared orchestration logic

---

## What Is an Agent in Attune AI?
An agent is defined as a structured configuration that controls:
- Conversational style and tone
- Scope of supported topics
- Questioning and reflection strategies
- Access to domain-specific knowledge

All agents share a common execution pipeline but differ in policy and retrieved context.

---

## Agent Profile Structure

Each agent includes:

- **id**  
  Unique identifier (e.g., `addiction_support`)

- **name**  
  Human-readable display name

- **description**  
  What the agent is designed to help with

- **system_prompt**  
  Defines tone, structure, and boundaries

- **rag_namespace / agent_id**  
  Determines which knowledge documents the agent can retrieve

- **intake_questions**  
  Initial prompts to guide session setup

---

## Shared Core Capabilities
All agents are capable of:
- Reflective listening
- Clarification and paraphrasing
- Emotion labeling
- Goal identification
- Action planning
- Session summarization

---

## Agent Types (MVP)

### 1. Addiction Support Agent
Focus areas:
- Cravings and triggers
- Motivational interviewing-style prompts
- Coping and delay strategies
- Relapse prevention concepts

RAG content includes:
- Craving management tools
- Psychoeducation on addiction patterns
- Reflective worksheets

---

### 2. Relationship / Couples Communication Agent
Focus areas:
- Communication breakdowns
- Conflict patterns
- Needs, boundaries, and repair attempts
- Perspective-taking

RAG content includes:
- Communication frameworks
- Conflict de-escalation techniques
- Structured dialogue prompts

---

### 3. Family Communication Agent
Focus areas:
- Family roles and dynamics
- Boundary setting
- Household communication norms
- Problem-solving discussions

RAG content includes:
- Family systems concepts
- Meeting templates
- Parenting communication strategies

---

### 4. General Reflection Agent
Focus areas:
- Stress and emotional processing
- Self-reflection and insight building
- Decision-making support

RAG content includes:
- Grounding techniques
- Cognitive reframing tools
- Stress management strategies

---

## Agent Execution Pipeline

1. User selects an agent
2. Session is created with agent configuration
3. Voice or text interaction begins
4. User input triggers:
   - Optional RAG retrieval
   - LLM response generation
5. Transcript turns are stored
6. Session ends
7. Post-session summary is generated and saved

---

## Safety & Boundaries (All Agents)
- Agents do not diagnose or treat mental health conditions
- No medication or clinical advice
- Crisis language triggers:
  - Supportive response
  - Encouragement to seek immediate professional help
- Agents remain non-judgmental and neutral

---

## Design Philosophy
Attune AI agents are:
- **Supportive, not authoritative**
- **Structured, not prescriptive**
- **Domain-aware, not all-knowing**

The system prioritizes transparency, safety, and explainability over autonomy or clinical realism.
