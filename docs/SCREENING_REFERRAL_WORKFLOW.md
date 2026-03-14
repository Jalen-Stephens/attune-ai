# Screening + Referral Workflow Implementation

This document describes the end-to-end screening and referral workflow implemented for Attune AI.

## Overview

The system transforms voice/chat agents into a "screening + referral" layer that:
1. Collects intake information during conversations
2. Uses Google Places API to find therapists/specialists near the user
3. Presents 1-5 best options during the conversation
4. Sends a structured email summary after the interaction

## Architecture

### Data Model

**New Tables:**
- `sessions` (extended): Added `user_email`, `user_phone`, `channel`, `vapi_call_id`
- `intakes`: User intake information (symptoms, location, insurance, preferences)
- `referrals`: Provider recommendations with scoring and ranking
- `events`: Audit trail for debugging and analytics
- `email_summaries`: Email delivery tracking with retry logic

### Key Components

#### 1. Google Places Integration (`src/lib/google-places/`)
- **client.ts**: Places API and Geocoding API client (retries, timeouts)
- **searchTherapists.ts**: Therapist search by location (zip/city/state), scoring and ranking

#### 2. Agent Tools (`src/lib/agent-tools.ts`)
Functions the AI agent can call:
- `createOrUpdateIntake`: Save intake information incrementally
- `lookupSpecialists`: Search Google Places and return top providers
- `sendReferralEmail`: Enqueue email summary

#### 3. Email Service (`src/lib/email/`)
- Provider-agnostic interface
- Resend implementation for production
- Console provider for development
- Retry logic with exponential backoff

#### 4. API Endpoints

- `POST /api/intake`: Create/update intake
- `POST /api/referrals/lookup`: Search and store referrals
- `POST /api/referrals/email`: Send email summary
- `GET /api/referrals/[referralId]/click`: Track referral clicks

#### 5. Webhook Handler (`src/app/api/vapi/webhook/route.ts`)
- Handles Vapi webhook events
- Processes function calls from agent
- Maps Vapi call IDs to session IDs
- Signature verification for security

## Workflow

### 1. Session Start
```
User → Start Session → Create Session → Vapi Call Created
```

### 2. Screening Phase
```
Agent collects:
- Reason for visit / symptoms
- Duration
- Location (zip/city/state)
- Insurance information
- Appointment preference
- Email address
- Consent flags

Agent calls: createOrUpdateIntake (incrementally)
```

### 3. Referral Lookup
```
Agent calls: lookupSpecialists
→ Validates intake complete
→ Geocodes location (zip/city/state) via Geocoding API
→ Calls Google Places API (text search: therapist + location bias)
→ Scores providers (distance, rating)
→ Returns top results with match reasons
→ Stores in referrals table
```

### 4. Presentation
```
Agent presents providers:
- Name, credentials, specialty
- Location and distance
- Next available appointment
- Match reasons
- Booking link (with click tracking)
```

### 5. Email Summary
```
Call ends → Auto-send email (if consented)
OR
Agent calls: sendReferralEmail

→ Generates HTML + text email
→ Includes screening summary
→ Lists top referrals with booking links
→ Includes safety disclaimers
→ Sends via Resend (or console in dev)
→ Tracks delivery status
```

## Environment Variables

Add to `.env`:

```bash
# Google Places (provider search)
GOOGLE_PLACES_API_KEY=your_google_places_api_key
# Optional: for address→lat/lng (defaults to Places key if unset)
GOOGLE_GEOCODING_API_KEY=your_geocoding_api_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@attune-ai.com

# Vapi Webhook Security
VAPI_WEBHOOK_SECRET=your_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
PRODUCT_NAME=Attune AI
```

## Database Migration

Run the updated schema:

```sql
-- See supabase/schema.sql for full migration
-- Adds: intakes, referrals, events, email_summaries tables
-- Extends: sessions table with user contact info
```

## Agent Configuration

The agent system prompt is automatically enhanced with screening workflow instructions. Function definitions are provided to Vapi so the agent can call:
- `createOrUpdateIntake`
- `lookupSpecialists`
- `sendReferralEmail`

## Safety & Compliance

### Disclaimers
- All emails include: "This information is for screening and referral purposes only. It does not constitute medical advice, diagnosis, or treatment."
- Emergency language triggers: Encourages immediate professional help

### Privacy
- Consent gates: `consent_to_use_info` and `consent_to_email` required
- PHI handling: Only stores structured intake fields, not raw transcripts
- Email opt-out: User can decline email consent

### Reliability
- Idempotency: Session creation uses Vapi call ID for deduplication
- Retries: Email sending has 3 retries with exponential backoff
- Graceful fallbacks: If Google Places fails, user gets "we'll email options shortly"

## Analytics & Observability

### Events Tracked
- `intake_completed`: Intake saved
- `referrals_returned`: Providers found and returned
- `referral_clicked`: User clicked booking link
- `email_sent`: Email delivered successfully
- `email_failed`: Email delivery failed
- `provider_search_error`: Provider search (Google Places) API error
- `function_call`: Agent function call executed

### Metrics
Query `events` table for:
- Intake completion rate
- Referral click-through rate
- Email delivery rate
- Provider search (Google Places) success rate

## Testing

### Development Mode
- Email uses console provider (logs to stdout)
- Google Places API key optional (returns empty results with warning)
- Webhook signature verification skipped if secret not set

### Production Checklist
- [ ] Set `RESEND_API_KEY`
- [ ] Set `GOOGLE_PLACES_API_KEY`
- [ ] Set `VAPI_WEBHOOK_SECRET`
- [ ] Configure `RESEND_FROM_EMAIL` domain
- [ ] Test webhook signature verification
- [ ] Verify email delivery
- [ ] Test referral click tracking

## API Usage Examples

### Create Intake
```bash
POST /api/intake
{
  "session_id": "uuid",
  "reason_for_visit": "skin rash",
  "location_zip": "10001",
  "insurance_provider": "Blue Cross",
  "user_email": "user@example.com",
  "consent_to_use_info": true,
  "consent_to_email": true
}
```

### Lookup Referrals
```bash
POST /api/referrals/lookup
{
  "session_id": "uuid"
}
```

### Send Email
```bash
POST /api/referrals/email
{
  "session_id": "uuid"
}
```

## Next Steps

1. **Background Jobs**: Consider using Trigger.dev or similar for async email processing
2. **Caching**: Add Redis/memory cache for Google Places provider results
3. **Rate Limiting**: Add rate limits to API endpoints
4. **Monitoring**: Set up alerts for email failures, provider search errors
5. **A/B Testing**: Test different provider scoring weights
