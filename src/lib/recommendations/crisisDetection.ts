/**
 * Basic keyword-based crisis detection. If triggered, do NOT return normal
 * suggestions; show safety message and resources (e.g. 988) instead.
 */
const CRISIS_PATTERNS = [
  /\bkill\s*(my)?self\b/i,
  /\bsuicide\b/i,
  /\bend\s*(it\s*all|my\s*life)\b/i,
  /\bself[- ]?harm\b/i,
  /\bcutting\s*(my)?self\b/i,
  /\bhurt\s*(my)?self\b/i,
  /\bwant\s*to\s*die\b/i,
  /\bno\s*reason\s*to\s*live\b/i,
  /\bbetter\s*off\s*dead\b/i,
  /\bplan(ning)?\s*to\s*(die|end)\b/i,
];

export interface CrisisResult {
  isCrisis: boolean;
  message: string;
}

export function checkCrisis(userMessage: string): CrisisResult {
  const normalized = userMessage.trim().toLowerCase();
  if (!normalized) {
    return { isCrisis: false, message: '' };
  }

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        isCrisis: true,
        message:
          'If you or someone you know is in crisis, please reach out for help. You can call or text 988 (Suicide & Crisis Lifeline) in the US, 24/7, free and confidential. You don’t have to be in crisis to call. This app is not for emergencies—please connect with a trained professional or emergency services when you need immediate support.',
      };
    }
  }

  return { isCrisis: false, message: '' };
}
