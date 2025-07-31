import { authenticate } from 'mailauth';
import { EmailStatus } from '../types';
import { config } from '../config';
import pLimit from 'p-limit';

export class EmailVerifier {
  private readonly limit: any;
  private readonly sender: string;
  private readonly greylistCache = new Map<string, number>();

  constructor(concurrency: number = 10) {
    this.limit = pLimit(concurrency);
    this.sender = config.smtp.verifySender;
  }

  async verifyEmail(email: string): Promise<EmailStatus> {
    try {
      const cachedGreylist = this.greylistCache.get(email);
      if (cachedGreylist && Date.now() - cachedGreylist < 300000) {
        return 'greylist_retry';
      }

      const result = await authenticate(email, {
        sender: this.sender,
        validateMx: true,
        validateSMTP: true
      });

      if (result.smtp && typeof result.smtp === 'object' && result.smtp.code === 250) {
        return 'verified';
      }

      const smtpCode = result.smtp && typeof result.smtp === 'object' ? result.smtp.code : 0;
      if ([421, 450, 451, 452].includes(smtpCode)) {
        this.greylistCache.set(email, Date.now());
        return 'greylist_retry';
      }

      if (result.mx === false || result.smtp === false) {
        return 'invalid';
      }

      return 'unverified';
    } catch (error) {
      console.error(`Error verifying ${email}:`, error);
      return 'unverified';
    }
  }

  async verifyBatch(emails: string[]): Promise<Map<string, EmailStatus>> {
    const results = new Map<string, EmailStatus>();
    
    const verificationPromises = emails.map(email =>
      this.limit(async () => {
        const status = await this.verifyEmail(email);
        results.set(email, status);
        return { email, status };
      })
    );

    await Promise.all(verificationPromises);
    return results;
  }

  async retryGreylisted(emails: string[]): Promise<Map<string, EmailStatus>> {
    const greylistedEmails = emails.filter(
      email => this.greylistCache.has(email)
    );

    if (greylistedEmails.length === 0) {
      return new Map();
    }

    console.log(`Retrying ${greylistedEmails.length} greylisted emails...`);
    
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    for (const email of greylistedEmails) {
      this.greylistCache.delete(email);
    }

    return this.verifyBatch(greylistedEmails);
  }

  getDomainFromEmail(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : null;
  }

  async verifyDomain(domain: string): Promise<boolean> {
    try {
      const testEmail = `test@${domain}`;
      const result = await authenticate(testEmail, {
        sender: this.sender,
        validateMx: true,
        validateSMTP: false
      });

      return result.mx === true;
    } catch {
      return false;
    }
  }
}