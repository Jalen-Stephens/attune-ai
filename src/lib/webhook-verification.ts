/**
 * Webhook signature verification for Vapi
 */

import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || '';

/**
 * Verify Vapi webhook signature
 *
 * Vapi signs webhooks using HMAC-SHA256. Signature is in x-vapi-signature.
 * When "Include Timestamp" is on, Payload Format is {timestamp}.{body};
 * pass timestamp from x-timestamp so we sign the same string.
 */
export function verifyVapiSignature(
  payload: string | object,
  signature: string | null,
  timestamp?: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('VAPI_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  try {
    const bodyString =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadString =
      timestamp != null && timestamp !== ''
        ? `${timestamp}.${bodyString}`
        : bodyString;

    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}
