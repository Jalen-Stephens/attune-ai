/**
 * Resend email provider implementation
 */

import type { EmailProvider } from './types';

class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@attune-ai.com';
    
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY not set, email sending will fail');
    }
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY not configured',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const resendProvider = new ResendProvider();
