# Vapi Web SDK – Client-Side Voice Interface

This project uses the [Vapi Web SDK](https://docs.vapi.ai/quickstart/web) (`@vapi-ai/web`) for browser-based voice calls with a Vapi assistant. The widget lives in `src/components/voice/VapiVoiceWidget.tsx` and is used on the **Voice demo** page at `/voice`.

## Environment variables

Set these in `.env` (and `.env.local` for local overrides). **Use only the Public Key on the client; never use private keys in frontend code.**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Vapi **public** API key (client-safe) |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | Vapi assistant ID to use for web calls |

### Where to find them

- **Public key:** [Vapi Dashboard](https://dashboard.vapi.ai) → API Keys → use the **Public** key (not the private/secret key).
- **Assistant ID:** [Vapi Dashboard](https://dashboard.vapi.ai) → Assistants → select an assistant → copy its ID.

### Runtime validation

In **development**, if either variable is missing, the app throws a clear error and the voice widget will not initialize. Fix by adding both values to `.env` and restarting the dev server.

## Running the Voice demo

1. Copy `.env.example` to `.env` and set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.
2. Run `npm run dev` and open [http://localhost:3000/voice](http://localhost:3000/voice).
3. Use the floating widget (bottom-right) to **Start** a call, grant mic access, and talk. The live transcript appears in the widget.
4. Use **Stop** to end the call and **Clear transcript** to reset.

You can also reach the demo via the **Voice** link in the main nav.

## Events we handle

The widget subscribes to these Vapi Web SDK events:

| Event | What we do |
|-------|------------|
| `call-start` | Set status to “Live”, clear connecting state and error |
| `call-end` | Set status to “Idle”, clear connecting state |
| `message` | If `message.type === 'transcript'`, append `{ role, text }` to the transcript; otherwise store as last message for debug. We also handle `tool-calls` / `functionCall` and show a short “Tool: …” line (see [Client-side tool calls](#client-side-tool-calls)). |
| `error` | Store error message, set connecting/live to false |

## Client-side tool calls

We listen for `message.type === 'tool-calls'` (and `message.functionCall`) and log them + show a “Tool: &lt;name&gt;” line in the UI. **Important:** Client-side handling does **not** send tool results back to the model. If the assistant must receive tool outputs (e.g. DB lookups, API calls), use **server-side tools** (e.g. webhook tools or server SDK) instead.

## Common issues

### Mic permissions

- The browser will prompt for microphone access when you start a call.
- If you block or revoke access, start again and allow when prompted.
- Ensure you’re not using a device or browser profile that has mic disabled.

### HTTPS in production

- Production deployments must use **HTTPS**. Many browsers restrict mic access on plain HTTP (except `localhost`).

### Missing env vars

- **Dev:** You’ll see an explicit error if `NEXT_PUBLIC_VAPI_PUBLIC_KEY` or `NEXT_PUBLIC_VAPI_ASSISTANT_ID` is missing.
- **Fix:** Add both to `.env`, restart `npm run dev`, and reload `/voice`.

### Build errors

- Ensure `@vapi-ai/web` is installed (`npm install @vapi-ai/web`).
- The widget is a client component (`"use client"`); it must not be imported from server-only modules.

## Guardrails and security

- **Never** use `VAPI_API_KEY` or any private/secret key in client code.
- **Only** use `NEXT_PUBLIC_VAPI_PUBLIC_KEY` for the Web SDK.
- No server routes expose these keys; they are used only in the browser by the widget.
- See [Vapi security docs](https://docs.vapi.ai/) for best practices.

## End-of-call report and clean transcript

When Vapi sends an **end-of-call-report** webhook, we:

1. **Replace** the session’s transcript with the **clean** `artifact.messages` (no duplicates or partials).
2. **Store** the Vapi **summary** (`analysis.summary`) in `session_summaries`.
3. **End** the session.

The dashboard **polls** `GET /api/sessions/by-vapi-call/[callId]` after a call ends (using the call id from `call-start-success`). When transcript and/or summary are available, the in-dashboard chat log is **updated** with the final, clean transcription.

**Session Details:** The dashboard uses a **user** session (from “Start” / typed chat). The webhook creates a separate **voice** session (by `vapi_call_id`). After a call ends, the client calls `POST /api/sessions/link-voice-call` with `{ sessionId, vapiCallId }`. That **merges** the voice transcript and Vapi summary into the dashboard session and marks it **ended**. The Session Details page (Conversations → session) therefore shows the full transcript, summary, and status “ended” once the link runs.

## Webhook payload debugging

In **development**, the Vapi webhook handler writes **live** webhook payloads to `vapi-webhook-last.json` in the project root. Only `transcript` and `call-started` events are written; `call-ended` and `end-of-call-report` are skipped so you can inspect mid-conversation response structure. The file is overwritten on each new transcript (or call-started) and includes:

- `_receivedAt`: ISO timestamp when the request was received
- `_webhookType`: same as `type` (e.g. `transcript`, `call-started`)
- The full Vapi payload (e.g. `type`, `call`, `transcript` / `message`, etc.)

Use this to inspect the exact structure of live transcript events. The file is gitignored.

## References

- [Vapi Web quickstart](https://docs.vapi.ai/quickstart/web)
- [Vapi Web SDK (npm)](https://www.npmjs.com/package/@vapi-ai/web)
- [Vapi Dashboard](https://dashboard.vapi.ai)
