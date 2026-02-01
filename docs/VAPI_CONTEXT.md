# Vapi Call Context Injection

When a user starts a voice call from the **chat UI** (Dashboard), we inject **user-aware context** so the assistant (Peter) can greet by name and use prior chat as **private background** (not read aloud).

## What is sent to Vapi

- **firstName** – From the user’s profile (`full_name` first word, or `display_name`).
- **lastName** – From the user’s profile (`full_name` remaining words), or empty.
- **sessionId** – The current chat session ID.
- **chatSummary** – A short, **sanitized** summary of the last N transcript turns (see below). Passed only in `variableValues`; **never** included in the first spoken line.

These are sent in two ways:

1. **assistantOverrides.firstMessage** – A **generic** opening line that uses **name only** (no summary):  
   - If name exists: *"Hi {{firstName}}, I'm Peter. What's been going on?"*  
   - If no name: *"Hi, I'm Peter. What's been going on?"*
2. **assistantOverrides.variableValues** – `{ firstName, lastName, sessionId, chatSummary }`. The assistant can use `{{firstName}}`, `{{chatSummary}}`, etc. in prompts. **chatSummary** is sanitized (see below) and is for **private background only**; Peter must not read it verbatim. See `docs/VAPI_PETER_PROMPT.md` for variable rules.

If the **call-context** request fails (e.g. 401, 404, 500), the call still starts with the assistant’s default greeting (no name or summary).

## How chatSummary is produced

1. **POST /api/vapi/call-context** is called with `{ sessionId }`.
2. The server loads the session and last N transcript turns (up to 20).
3. **Option 1 (preferred):** An LLM summarizer (e.g. `gpt-4o-mini`) produces a 2–4 sentence (or 3–6 bullet) summary that is safe to read aloud and avoids PHI beyond what the user already shared.
4. **Option 2 (fallback):** A heuristic summary: concatenation of the latest user messages, truncated (e.g. 300 chars).

Summary instructions to the LLM: keep it short, safe to read aloud, no sensitive/clinical language, no diagnosis.

Before sending to Vapi, **chatSummary** is sanitized on the client (`sanitizeChatSummary` in `src/lib/vapi/call-context-summary.ts`): strip leading phrases like “The user described…”, “According to the summary…”, trim to ~240 characters, remove quotes and newlines. The sanitized value is what appears in `variableValues.chatSummary`; the assistant uses it only as private background and must not read it verbatim (see `docs/VAPI_PETER_PROMPT.md`).

## API: POST /api/vapi/call-context

- **Input:** `{ sessionId: string }` (UUID).
- **Auth:** Logged-in user required (Supabase session). The session must belong to that user (enforced by RLS).
- **Response:**  
  `{ firstName, lastName, sessionId, chatSummary }`

Types are in `src/lib/vapi/types.ts` (`CallContextResponse`).

## How to test

1. Run the app and log in.
2. Open the Dashboard (chat).
3. Send a few messages (e.g. “I can’t sleep and my mind is racing”).
4. Click **Call** (mic/voice) to start a Vapi call.
5. **Expected:** The assistant greets you by first name with a generic line (“Hi &lt;name&gt;, I’m Peter. What’s been going on?”) and does **not** read the chat summary verbatim. He may use it as background to ask a gentle clarifying question.
6. In development, open the browser console: you should see `[Vapi] variableValues` with the payload sent to Vapi. If call-context fails, you’ll see `[Vapi] call-context failed, starting with generic greeting` and the call still starts.

### Sample variableValues (dev console)

```json
{
  "firstName": "Jalen",
  "lastName": "Stephens",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "chatSummary": "having trouble sleeping and experiencing racing thoughts at night."
}
```

Note: `chatSummary` here is sanitized (no “The user described…”, length cap, no quotes/newlines). Peter uses it only as private context; he must not read it word-for-word (see `docs/VAPI_PETER_PROMPT.md`).

## Privacy and safety

- **No secrets:** Only first/last name (from profile) and a short, controlled summary of the chat are sent. No passwords, tokens, or raw logs.
- **Minimal summary:** The summarizer is instructed to keep the summary brief and safe to read aloud; avoid storing or sending highly sensitive details.
- **Server-side only:** Summary is generated on the server; the client only receives the final JSON and passes it to the Vapi Web SDK.
- **Failure behavior:** If call-context fails, the call starts without context (generic greeting). No context is sent unless the endpoint succeeds.

## Where context is used

- **Dashboard chat:** When the user starts a call from the main chat (or from a suggested agent), `useVapiVoice` is called with the current `sessionId`. Before `vapi.start()`, the client calls `/api/vapi/call-context` and then passes `assistantOverrides` (firstMessage + variableValues) into `start(assistantId, assistantOverrides)`.
- **Standalone voice page** (`/dashboard/voice` or `/voice`): The floating Vapi widget does **not** have a sessionId, so no context is fetched; the call uses the assistant’s default greeting.
