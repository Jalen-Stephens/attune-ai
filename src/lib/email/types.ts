/**
 * Email service types
 */

export interface EmailProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}
