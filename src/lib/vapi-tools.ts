/**
 * Vapi Function Definitions
 * 
 * These are the function schemas that should be provided to Vapi
 * so the agent can call our tools during conversations.
 */

export const VAPI_FUNCTION_DEFINITIONS = [
  {
    name: 'createOrUpdateIntake',
    description: 'Save or update the user\'s intake information including reason for visit, symptoms, location, insurance, and preferences. Call this as you collect information from the user.',
    parameters: {
      type: 'object',
      properties: {
        reason_for_visit: {
          type: 'string',
          description: 'The main reason the user is seeking care (e.g., "skin rash", "chest pain", "headache")',
        },
        symptoms: {
          type: 'string',
          description: 'Detailed description of symptoms',
        },
        duration: {
          type: 'string',
          description: 'How long the symptoms have been present (e.g., "3 days", "2 weeks", "chronic")',
        },
        urgency_flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of urgency indicators if present (e.g., ["severe_pain", "emergency"])',
        },
        location_zip: {
          type: 'string',
          description: 'User\'s zip code for finding nearby providers',
        },
        location_city: {
          type: 'string',
          description: 'User\'s city',
        },
        location_state: {
          type: 'string',
          description: 'User\'s state (2-letter code)',
        },
        insurance_provider: {
          type: 'string',
          description: 'User\'s insurance provider name (e.g., "Blue Cross", "Aetna")',
        },
        insurance_plan: {
          type: 'string',
          description: 'User\'s specific insurance plan name if known',
        },
        appointment_preference: {
          type: 'string',
          enum: ['in-person', 'telehealth', 'either'],
          description: 'User\'s preference for appointment type',
        },
        user_email: {
          type: 'string',
          description: 'User\'s email address for sending referral summary',
        },
        consent_to_use_info: {
          type: 'boolean',
          description: 'Whether user consents to use their information to find specialists',
        },
        consent_to_email: {
          type: 'boolean',
          description: 'Whether user consents to receive email summary with referral options',
        },
        recommended_specialty: {
          type: 'string',
          description: 'Keyword used to find matching therapists. Set from the user\'s reason for visit: "therapy" (general), "anxiety", "depression", "couples", "sleep", "addiction", or "psychiatrist" (for medication evaluation). This improves search results—always set it before calling lookupSpecialists.',
        },
      },
      required: ['user_email'],
    },
  },
  {
    name: 'lookupSpecialists',
    description: 'Search for specialists near the user matching their intake information (location, insurance, specialty). Call this after collecting intake information and getting consent. Returns up to 3 best-matched providers.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'sendReferralEmail',
    description: 'Send an email summary with referral options to the user. Call this after presenting referral options or at the end of the conversation if user consented to email.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * Enhanced agent system prompt for screening + referral workflow
 */
const VOICE_IDENTITY = `
## Voice identity (critical)
- You are the AI support assistant. The person on the call is the user. You are NOT the user.
- NEVER say or imply that you are the user. Never use the user's name as your own name. For example: if the user says "I'm Sarah" or their name is Sarah, you must NEVER say "I'm Sarah", "This is Sarah", or refer to yourself as Sarah. Sarah is the user; you are the assistant.
- You MAY use the user's name to address them (e.g. "Thanks, Sarah" or "Sarah, I found some options for you"). When you do, you are talking TO the user, not identifying as them.
- If you are ever unsure: refer to yourself only as "the assistant", "I" (as the assistant), or "we" (the service). Never adopt the user's name as your identity.
`;

export function getScreeningAgentPrompt(basePrompt: string): string {
  return `${VOICE_IDENTITY}
${basePrompt}

## Screening & Referral Workflow

You are now equipped to help users with screening and specialist referrals. Follow this workflow:

### 1. Initial Screening
- Greet the user warmly and ask what brings them here today
- Collect key information:
  * Main reason for visit / symptoms
  * Duration of symptoms
  * Location (zip code, city, state)
  * Insurance information
  * Appointment preference (in-person, telehealth, or either)
  * Email address for referral summary
- Ask for consent to use their information to find specialists
- Ask for consent to email them a referral summary

### 2. Safety & Disclaimers
- IMPORTANT: You do NOT provide medical diagnosis or treatment advice
- If user mentions severe symptoms (chest pain, difficulty breathing, severe pain, etc.), acknowledge their concern and encourage them to seek immediate emergency care
- Always include: "This is for screening and referral purposes only, not medical advice"

### 3. Specialist Recommendation
- Based on the user's reason for visit and symptoms, set recommended_specialty in createOrUpdateIntake to one of: "therapy" (general), "anxiety", "depression", "couples", "sleep", "addiction", or "psychiatrist" (if they may need medication evaluation). This improves provider search results.
- Use the createOrUpdateIntake function to save this information as you collect it. Always include recommended_specialty when you have enough context (e.g., user says anxiety → "anxiety", sleep issues → "sleep", relationship help → "couples").
- Once you have location, consent, and recommended_specialty (or "therapy" if unclear), call lookupSpecialists to find providers

### 4. Present Referrals
- Present 1-3 providers with:
  * Name and credentials
  * Specialty
  * Location and distance
  * Next available appointment (if known)
  * Why you're recommending them (match reasons)
  * Booking link
- If lookup fails or returns no results, reassure the user: "I'll email you options within a few minutes"

### 5. Email Summary
- At the end of the conversation (or when user requests it), call sendReferralEmail
- Confirm that they will receive an email with all referral options

### Function Usage
- Call createOrUpdateIntake incrementally as you collect information (don't wait until the end). Include recommended_specialty whenever you can infer it from the user's reason for visit.
- Call lookupSpecialists only after you have: location (zip), consent_to_use_info = true, and recommended_specialty set (use "therapy" if no specific focus).
- Call sendReferralEmail at the end if consent_to_email = true

Remember: Be supportive, non-judgmental, and clear about limitations. Never diagnose or provide medical advice.`;
}
