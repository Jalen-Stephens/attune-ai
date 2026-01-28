/**
 * Webhook signature verification for Vapi
 */

import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || '';

/**
 * Verify Vapi webhook signature
 * 
 * Vapi signs webhooks using HMAC-SHA256
 * Signature is sent in the x-vapi-signature header
 */
export function verifyVapiSignature(
  payload: string | object,
  signature: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('VAPI_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  try {
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');
    
    // Use constant-time comparison to prevent timing attacks
    // Ensure both signatures are the same length
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
