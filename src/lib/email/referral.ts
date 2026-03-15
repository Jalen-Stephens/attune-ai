/**
 * Send referral summary email
 */

import { sendEmail } from './index';
import { generateReferralEmail } from './templates';
import { 
  createOrGetEmailSummary, 
  updateEmailSummaryStatus,
  getEmailSummary,
} from '../db';
import type { Intake, Referral } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Send referral email with retry logic
 */
export async function sendReferralEmail(
  sessionId: string,
  intake: Intake,
  referrals: Referral[]
): Promise<void> {
  if (!intake.user_email?.trim()) {
    throw new Error('Cannot send referral email: intake has no email address');
  }
  // Generate email content
  const { subject, html, text } = generateReferralEmail(intake, referrals);

  // Create email summary record (idempotent)
  const emailSummary = await createOrGetEmailSummary(
    sessionId,
    intake.user_email,
    subject,
    html,
    text,
    referrals
  );

  // If already sent successfully, skip
  if (emailSummary.status === 'sent') {
    return;
  }

  // Try to send email with retries
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await sendEmail({
        to: intake.user_email,
        subject,
        html,
        text,
      });

      if (result.success) {
        await updateEmailSummaryStatus(
          emailSummary.idempotency_key,
          'sent'
        );
        return;
      } else {
        throw new Error(result.error || 'Email sending failed');
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < MAX_RETRIES - 1) {
        // Update status to retrying
        await updateEmailSummaryStatus(
          emailSummary.idempotency_key,
          'retrying',
          lastError.message
        );
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  // All retries failed
  await updateEmailSummaryStatus(
    emailSummary.idempotency_key,
    'failed',
    lastError?.message || 'Max retries exceeded'
  );

  throw lastError || new Error('Failed to send email after retries');
}
