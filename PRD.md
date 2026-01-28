# Attune AI – Product Requirements Document (PRD)

## Overview
Attune AI is a voice- and text-based AI support platform that provides structured, psychologically informed conversations through specialized AI agents. Each agent is designed to support a specific domain (e.g., addiction support, relationship communication, family dynamics) using evidence-informed conversational frameworks, retrieval-augmented generation (RAG), and post-session summaries.

Attune AI is intended as a **supportive, educational, and reflective platform**, not as a replacement for licensed mental health professionals.

---

## Goals
- Demonstrate an **agent-based AI platform** with multiple personas
- Integrate **voice-based interaction** using Vapi
- Ground responses using **retrieval-augmented generation (RAG)**
- Persist sessions, transcripts, and structured summaries
- Provide a simple dashboard to review past sessions

---

## Non-Goals
- Clinical diagnosis or treatment
- Medication advice
- Emergency or crisis intervention beyond escalation guidance
- Long-term user modeling or personalization (out of scope for MVP)

---

## Target Users
- Users seeking reflective or coaching-style support
- Individuals exploring communication patterns or coping strategies
- Demo users evaluating agent-based AI systems

---

## Core Features (MVP)

### 1. Multi-Agent Support System
Users can select from multiple AI agents, each with:
- A specialized conversational focus
- A distinct system prompt and behavioral policy
- A dedicated RAG knowledge corpus

Example agents:
- Addiction Support Agent
- Relationship / Couples Communication Agent
- Family Communication Agent
- General Stress & Reflection Agent

---

### 2. Voice Sessions (Vapi Integration)
- Real-time voice conversations with AI agents
- Session-based calls with:
  - Start / end timestamps
  - Transcripts captured and stored
  - Agent responses generated using LLMs

---

### 3. Retrieval-Augmented Generation (RAG)
- Each agent queries a **scoped knowledge base**
- Knowledge sources include:
  - Psychoeducational content
  - Conversation frameworks
  - Coping and communication tools
- Vector search using embeddings (pgvector)

---

### 4. Post-Session Summaries
After a session ends, the platform generates:
- A human-readable summary
- A structured JSON summary including:
  - Topics discussed
  - Emotional themes
  - Patterns or cognitive distortions
  - Tools or strategies mentioned
  - Action items / next steps
  - Follow-up prompts

---

### 5. Session Dashboard
- View list of past sessions
- Open session detail pages showing:
  - Full transcript
  - Generated summary
  - Agent type used

---

## Technical Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase Postgres
- **Vector Search:** pgvector
- **Voice:** Vapi
- **LLM:** OpenAI API
- **Storage:** Supabase Storage (optional)

---

## Data Models (High-Level)
- AgentProfile
- Session
- TranscriptTurn
- SessionSummary
- RagDocument

---

## Safety & Ethics
- Clear disclaimers presented to users
- No diagnosis or medical advice
- Crisis-related language triggers an escalation response
- Encourages seeking professional help when appropriate

---

## Success Criteria (for Midterm)
- Successfully complete at least one voice session
- Demonstrate RAG grounding in agent responses
- Persist transcripts and summaries
- Show a working dashboard with session history
- Clearly articulate agent architecture and design decisions
