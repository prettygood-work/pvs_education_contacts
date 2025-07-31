import { chromium } from 'playwright';
import { Contact, District, ScraperOptions } from '../types';
import { config } from '../config';

// Note: Playwright has built-in stealth features

export class PlaywrightScraper {
  private browser: any = null;
  private readonly options: ScraperOptions;

  constructor(options?: ScraperOptions) {
    this.options = {
      headless: options?.headless ?? config.scraper.headless,
      timeout: options?.timeout ?? config.scraper.timeout,
      maxRetries: options?.maxRetries ?? config.scraper.maxRetries
    };
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeDistrict(district: District): Promise<Contact[]> {
    if (!district.website) {
      return [];
    }

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
      bypassCSP: true,
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      permissions: [],
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    try {
      const page = await context.newPage();
      
      await page.goto(district.website, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout
      });

      await this.handleCaptcha(page);

      const contacts: Contact[] = [];
      
      const staffLinks = await this.findStaffPages(page);
      
      for (const link of staffLinks.slice(0, 5)) {
        try {
          await page.goto(link, {
            waitUntil: 'networkidle',
            timeout: this.options.timeout
          });
          
          const pageContacts = await this.extractContactsFromPage(page);
          contacts.push(...pageContacts);
        } catch (error) {
          console.error(`Error scraping ${link}:`, error);
        }
      }

      if (contacts.length === 0) {
        const homePageContacts = await this.extractContactsFromPage(page);
        contacts.push(...homePageContacts);
      }

      return this.deduplicateContacts(contacts);
    } finally {
      await context.close();
    }
  }

  private async handleCaptcha(page: any): Promise<void> {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      '.g-recaptcha',
      '#captcha',
      'div[class*="captcha"]'
    ];

    for (const selector of captchaSelectors) {
      const captcha = await page.$(selector);
      if (captcha) {
        console.log('CAPTCHA detected, skipping detailed scraping');
        throw new Error('CAPTCHA_DETECTED');
      }
    }
  }

  private async findStaffPages(page: any): Promise<string[]> {
    const links = await page.evaluate(() => {
      const keywords = [
        'staff', 'directory', 'contact', 'about', 'administration',
        'leadership', 'team', 'departments', 'facilities', 'maintenance',
        'operations', 'business'
      ];
      
      const anchors = Array.from(document.querySelectorAll('a'));
      const relevantLinks: string[] = [];
      
      anchors.forEach((anchor: HTMLAnchorElement) => {
        const href = anchor.href;
        const text = anchor.textContent?.toLowerCase() || '';
        
        if (keywords.some(keyword => text.includes(keyword) || href.includes(keyword))) {
          relevantLinks.push(href);
        }
      });
      
      return Array.from(new Set(relevantLinks));
    });

    return links;
  }

  private async extractContactsFromPage(page: any): Promise<Contact[]> {
    return page.evaluate(() => {
      const contacts: Contact[] = [];
      const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      
      const titleKeywords = [
        'director', 'manager', 'supervisor', 'coordinator', 'administrator',
        'superintendent', 'assistant', 'chief', 'head', 'lead', 'specialist',
        'facilities', 'maintenance', 'operations', 'purchasing', 'procurement',
        'business', 'finance', 'hr', 'human resources', 'technology', 'it'
      ];

      const textContent = document.body.innerText || '';
      const emails = textContent.match(emailRegex) || [];
      
      const lines = textContent.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (emails.some((email: string) => line.includes(email))) {
          let name = '';
          let title = '';
          let email = '';
          let phone = '';
          
          const emailMatch = line.match(emailRegex);
          if (emailMatch) {
            email = emailMatch[0];
          }
          
          const phoneMatch = line.match(phoneRegex);
          if (phoneMatch) {
            phone = phoneMatch[0];
          }
          
          for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
            const nearbyLine = lines[j].trim();
            
            if (j !== i && nearbyLine.length > 2 && nearbyLine.length < 50) {
              if (titleKeywords.some(keyword => nearbyLine.toLowerCase().includes(keyword))) {
                title = nearbyLine;
              } else if (!name && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(nearbyLine)) {
                name = nearbyLine;
              }
            }
          }
          
          if (email) {
            const [firstName, lastName] = name.split(' ').filter(Boolean);
            
            contacts.push({
              firstName: firstName || '',
              lastName: lastName || '',
              title: title || '',
              email: email,
              phone: phone || undefined,
              confidence: (firstName && lastName) ? 90 : 70
            });
          }
        }
      }
      
      return contacts;
    });
  }

  private deduplicateContacts(contacts: Contact[]): Contact[] {
    const seen = new Set<string>();
    const unique: Contact[] = [];
    
    for (const contact of contacts) {
      const key = `${contact.email}-${contact.firstName}-${contact.lastName}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(contact);
      }
    }
    
    return unique;
  }

  async testConnection(url: string): Promise<boolean> {
    const context = await this.browser.newContext();
    try {
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      return response?.status() === 200;
    } catch {
      return false;
    } finally {
      await context.close();
    }
  }
}