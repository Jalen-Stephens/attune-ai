/**
 * Console email provider (for development/testing)
 */

import type { EmailProvider } from './types';

class ConsoleProvider implements EmailProvider {
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('='.repeat(80));
    console.log('EMAIL (Console Provider)');
    console.log('='.repeat(80));
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log('-'.repeat(80));
    console.log('TEXT CONTENT:');
    console.log(params.text);
    console.log('-'.repeat(80));
    console.log('HTML CONTENT:');
    console.log(params.html);
    console.log('='.repeat(80));

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}

export const consoleProvider = new ConsoleProvider();
