# Vapi Server-Side Tools

Server-side tools for the Vapi voice agent (Peter). Each tool is a standalone Next.js API route that Vapi calls via HTTP when the assistant invokes the corresponding function.

---

## Overview

| Tool Name       | Route                             | Purpose                                              |
|----------------|-----------------------------------|------------------------------------------------------|
| `findProviders` | `POST /api/tools/findProviders`   | Simulate provider search (Zocdoc-style). Returns sample results. |
| `getRagResources` | `POST /api/tools/getRagResources` | Fetch RAG-backed resources for the patient after the call. |

Both routes require the `X-VAPI-SECRET` header matching `VAPI_SERVER_SECRET` in your environment. Missing or invalid secret returns `401 Unauthorized`.

---

## Environment

Add to `.env`:

```bash
VAPI_SERVER_SECRET=your_secure_secret_here
```

Use the same secret when configuring the tool URLs in the Vapi Dashboard. Vapi will send this value in the `X-VAPI-SECRET` header when calling your endpoints.

---

## Peter Workflow

1. **After intake is complete**  
   Call `findProviders` with zip, specialty, modality, insurance, and time preference from the intake.

2. **Present 2–3 provider options**  
   Summarize the top results for the user and offer to email them.

3. **At end of call**  
   Call `getRagResources` with the session ID (and optionally topic or last user message). Then say:

   > *"While you're waiting to meet your therapist, here are a few things you can use right now…"*

   Read out 2–3 resource titles and brief descriptions.

---

## Tool 1: findProviders

**Route:** `POST /api/tools/findProviders`

**Request body (JSON):**

```json
{
  "zip": "94102",
  "specialty": "therapy",
  "modality": "telehealth",
  "insurance": "Aetna",
  "timePreference": "mornings"
}
```

| Field          | Type     | Required | Description                                                                 |
|----------------|----------|----------|-----------------------------------------------------------------------------|
| `zip`          | string   | Yes      | ZIP code for location search                                                |
| `specialty`    | string   | Yes      | One of: `therapy`, `psychiatry`, `couples`, `sleep`, `anxiety`, `depression`, `addiction`, `general` |
| `modality`     | string   | Yes      | One of: `telehealth`, `in_person`, `either`                                |
| `insurance`    | string   | No       | Insurance provider name (nullable)                                          |
| `timePreference` | string | Yes      | One of: `mornings`, `afternoons`, `evenings`, `weekends`, `any`            |

**Response (200):**

```json
{
  "providers": [
    {
      "providerId": "prov-001",
      "name": "Dr. Sarah Chen",
      "credentials": "PsyD, Licensed Psychologist",
      "specialties": ["Anxiety", "Depression", "CBT"],
      "modality": "telehealth",
      "location": { "city": "San Francisco", "state": "CA", "zip": "94102" },
      "distanceMiles": 3,
      "nextAvailable": "2025-02-05T14:00:00.000Z",
      "bookingUrl": "https://zocdoc.com/providers/prov-001",
      "summary": "Warm, evidence-based approach. Specializes in anxiety and mood."
    }
  ],
  "disclaimer": "These are sample results while provider search is in beta."
}
```

**Example curl:**

```bash
curl -X POST http://localhost:3000/api/tools/findProviders \
  -H "Content-Type: application/json" \
  -H "X-VAPI-SECRET: YOUR_VAPI_SERVER_SECRET" \
  -d '{
    "zip": "94102",
    "specialty": "therapy",
    "modality": "telehealth",
    "insurance": null,
    "timePreference": "mornings"
  }'
```

---

## Tool 2: getRagResources

**Route:** `POST /api/tools/getRagResources`

**Request body (JSON):**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "topic": "sleep",
  "userMessage": null,
  "agentId": null
}
```

| Field        | Type   | Required | Description                                                                 |
|-------------|--------|----------|-----------------------------------------------------------------------------|
| `sessionId` | string | Yes      | Session ID (Attune session UUID linked to the call)                         |
| `topic`     | string | No       | Topic hint (e.g. `sleep`, `anxiety`, `relationships`, `general`)            |
| `userMessage` | string | No     | Last user message or key phrase to guide retrieval                          |
| `agentId`   | string | No       | Agent namespace for RAG (e.g. `sleep_insomnia`, `anxiety_panic`)            |

**Query resolution order:** `userMessage` → `topic` → last ~6 transcript turns from `sessionId`.

**Agent resolution order:** `agentId` → topic mapping (`sleep` → `sleep_insomnia`, `anxiety` → `anxiety_panic`, `relationships` → `relationship_communication`, `general` → `general_reflection`) → `general_reflection`.

**Response (200):**

```json
{
  "resources": [
    {
      "title": "Understanding Sleep Pressure and Cues",
      "type": "article",
      "url": null,
      "snippet": "Use this when you want to understand why you sometimes feel wide awake at bedtime or tired at the wrong times...",
      "why": "Highly relevant to what you discussed."
    }
  ]
}
```

**Example curl:**

```bash
curl -X POST http://localhost:3000/api/tools/getRagResources \
  -H "Content-Type: application/json" \
  -H "X-VAPI-SECRET: YOUR_VAPI_SERVER_SECRET" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "topic": "sleep",
    "userMessage": null,
    "agentId": null
  }'
```

---

## Vapi Dashboard Configuration

1. Create a **Server-Side Function** (or equivalent) for each tool.
2. Set the **URL** to your deployed base + route, e.g.:
   - `https://your-app.vercel.app/api/tools/findProviders`
   - `https://your-app.vercel.app/api/tools/getRagResources`
3. Configure the request to:
   - Use **POST**
   - Include header: `X-VAPI-SECRET: <your-secret>`
   - Send the JSON body as specified above (Vapi maps function parameters to the body).
4. Map the response to variables Peter can reference when speaking.

---

## Error Responses

| Status | Meaning                                                        |
|--------|----------------------------------------------------------------|
| 400    | Validation failed (check `details` for field-level errors)     |
| 401    | Missing or invalid `X-VAPI-SECRET`                             |
| 500    | Internal error (provider search or RAG retrieval failed)       |

Error payloads do not expose secrets or stack traces.
