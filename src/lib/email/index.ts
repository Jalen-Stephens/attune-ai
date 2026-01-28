/**
 * Email service
 * 
 * Provider-agnostic email sending interface
 */

import { resendProvider } from './resend';
import { consoleProvider } from './console';
import type { EmailProvider } from './types';

// Use Resend in production, console in development
const emailProvider: EmailProvider = 
  process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY
    ? resendProvider
    : consoleProvider;

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return emailProvider.sendEmail(params);
}

// Re-export referral email function
export { sendReferralEmail } from './referral';
