/**
 * Email templates for referral summaries
 */

import type { Intake, Referral } from '../types';

const PRODUCT_NAME = process.env.PRODUCT_NAME || 'Attune AI';

/**
 * Generate referral summary email
 */
export function generateReferralEmail(
  intake: Intake,
  referrals: Referral[]
): { subject: string; html: string; text: string } {
  const subject = `Your referral options from ${PRODUCT_NAME}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Format referral for display
  const formatReferral = (ref: Referral, index: number) => {
    const location = [
      ref.location_address,
      ref.location_city,
      ref.location_state,
      ref.location_zip,
    ]
      .filter(Boolean)
      .join(', ');

    const distance = ref.distance_miles
      ? `${ref.distance_miles.toFixed(1)} miles away`
      : '';

    const availability = ref.next_available_date
      ? `Next available: ${new Date(ref.next_available_date).toLocaleDateString()}`
      : '';

    const rating = ref.rating && ref.review_count
      ? `${ref.rating.toFixed(1)} ⭐ (${ref.review_count} reviews)`
      : '';

    const matchReasons = ref.match_reasons && ref.match_reasons.length > 0
      ? `• ${ref.match_reasons.join(', ')}`
      : '';

    return {
      index: index + 1,
      name: ref.provider_name,
      credentials: ref.provider_credentials,
      specialty: ref.specialty,
      location,
      distance,
      availability,
      rating,
      matchReasons,
      bookingUrl: `${baseUrl}/api/referrals/${ref.provider_id}/click?session_id=${ref.session_id}&redirect=${encodeURIComponent(ref.booking_url)}`,
    };
  };

  const formattedReferrals = referrals.map(formatReferral);

  // Build screening summary
  const screeningSummary = [
    intake.reason_for_visit && `Reason for visit: ${intake.reason_for_visit}`,
    intake.symptoms && `Symptoms: ${intake.symptoms}`,
    intake.duration && `Duration: ${intake.duration}`,
    intake.recommended_specialty && `Recommended specialist type: ${intake.recommended_specialty}`,
  ]
    .filter(Boolean)
    .join('\n');

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Your Referral Options</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">${PRODUCT_NAME}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Screening Summary</h2>
    <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 30px; border-left: 4px solid #667eea;">
      <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${screeningSummary || 'No specific details provided.'}</pre>
    </div>

    <h2 style="color: #1f2937;">Recommended Specialists</h2>
    <p style="color: #6b7280; margin-bottom: 30px;">Based on your information, here are ${referrals.length} specialist${referrals.length > 1 ? 's' : ''} we recommend:</p>

    ${formattedReferrals.map(ref => `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0 0 4px; color: #111827; font-size: 20px;">
              ${ref.index}. ${ref.name}
              ${ref.credentials ? `<span style="color: #6b7280; font-weight: normal;">, ${ref.credentials}</span>` : ''}
            </h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">${ref.specialty}</p>
          </div>
        </div>

        ${ref.location ? `<p style="margin: 8px 0; color: #374151;"><strong>📍 Location:</strong> ${ref.location}${ref.distance ? ` (${ref.distance})` : ''}</p>` : ''}
        
        ${ref.availability ? `<p style="margin: 8px 0; color: #374151;"><strong>📅 ${ref.availability}</strong></p>` : ''}
        
        ${ref.rating ? `<p style="margin: 8px 0; color: #374151;"><strong>⭐ Rating:</strong> ${ref.rating}</p>` : ''}
        
        ${ref.matchReasons ? `<p style="margin: 8px 0; color: #059669; font-size: 14px;">${ref.matchReasons}</p>` : ''}

        <a href="${ref.bookingUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; text-align: center;">
          Book Appointment →
        </a>
      </div>
    `).join('')}

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin-top: 30px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Important:</strong> This information is for screening and referral purposes only. 
        It does not constitute medical advice, diagnosis, or treatment. 
        ${intake.urgency_flags && intake.urgency_flags.length > 0 
          ? '<strong>If you are experiencing severe symptoms, please seek immediate emergency care.</strong>' 
          : 'If you have urgent medical concerns, please contact your healthcare provider or seek emergency care.'}
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">This email was sent to ${intake.user_email}</p>
      <p style="margin: 8px 0 0;">You received this because you consented to receive referral information.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Plain text version
  const text = `
${PRODUCT_NAME} - Your Referral Options

SCREENING SUMMARY
${'='.repeat(50)}
${screeningSummary || 'No specific details provided.'}

RECOMMENDED SPECIALISTS
${'='.repeat(50)}
Based on your information, here are ${referrals.length} specialist${referrals.length > 1 ? 's' : ''} we recommend:

${formattedReferrals.map(ref => `
${ref.index}. ${ref.name}${ref.credentials ? `, ${ref.credentials}` : ''}
   Specialty: ${ref.specialty}
   ${ref.location ? `Location: ${ref.location}${ref.distance ? ` (${ref.distance})` : ''}` : ''}
   ${ref.availability ? `${ref.availability}` : ''}
   ${ref.rating ? `Rating: ${ref.rating}` : ''}
   ${ref.matchReasons ? `Why we recommend: ${ref.matchReasons.replace(/^• /, '')}` : ''}
   Book appointment: ${ref.bookingUrl}
`).join('\n')}

IMPORTANT DISCLAIMER
${'='.repeat(50)}
This information is for screening and referral purposes only. It does not constitute medical advice, diagnosis, or treatment.
${intake.urgency_flags && intake.urgency_flags.length > 0 
  ? 'If you are experiencing severe symptoms, please seek immediate emergency care.' 
  : 'If you have urgent medical concerns, please contact your healthcare provider or seek emergency care.'}

---
This email was sent to ${intake.user_email}
You received this because you consented to receive referral information.
  `.trim();

  return { subject, html, text };
}
