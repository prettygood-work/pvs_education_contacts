import { Contact } from '../types';

export class EmailGenerator {
  private readonly patterns = [
    '{first}.{last}@{domain}',
    '{f}{last}@{domain}',
    '{first}_{last}@{domain}',
    '{last}{f}@{domain}',
    '{first}{last}@{domain}',
    '{f}.{last}@{domain}',
    '{first}-{last}@{domain}',
    '{last}.{first}@{domain}',
    '{f}{l}@{domain}',
    '{first}@{domain}',
    '{last}@{domain}'
  ];

  generateEmails(
    firstName: string, 
    lastName: string, 
    domain: string
  ): string[] {
    const first = this.cleanName(firstName);
    const last = this.cleanName(lastName);
    const f = first.charAt(0);
    const l = last.charAt(0);
    
    const emails: string[] = [];
    
    for (const pattern of this.patterns) {
      const email = pattern
        .replace('{first}', first)
        .replace('{last}', last)
        .replace('{f}', f)
        .replace('{l}', l)
        .replace('{domain}', domain);
        
      if (this.isValidEmail(email)) {
        emails.push(email);
      }
    }
    
    return [...new Set(emails)];
  }

  generateDepartmentEmails(domain: string): string[] {
    const departments = [
      'facilities',
      'maintenance',
      'operations',
      'purchasing',
      'procurement',
      'business',
      'admin',
      'info',
      'contact',
      'superintendent',
      'hr',
      'humanresources',
      'finance',
      'accounting',
      'it',
      'technology'
    ];
    
    return departments.map(dept => `${dept}@${domain}`);
  }

  inferPatternFromKnownEmails(knownContacts: Contact[]): string | null {
    const emailsWithNames = knownContacts.filter(
      c => c.email && c.firstName && c.lastName
    );
    
    if (emailsWithNames.length < 2) {
      return null;
    }
    
    const patternCounts = new Map<string, number>();
    
    for (const contact of emailsWithNames) {
      const pattern = this.detectPattern(
        contact.email!,
        contact.firstName,
        contact.lastName
      );
      
      if (pattern) {
        patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
      }
    }
    
    let mostCommonPattern: string | null = null;
    let maxCount = 0;
    
    for (const [pattern, count] of patternCounts) {
      if (count > maxCount) {
        mostCommonPattern = pattern;
        maxCount = count;
      }
    }
    
    return mostCommonPattern;
  }

  private detectPattern(
    email: string,
    firstName: string,
    lastName: string
  ): string | null {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return null;
    
    const first = this.cleanName(firstName);
    const last = this.cleanName(lastName);
    const f = first.charAt(0);
    const l = last.charAt(0);
    
    const localLower = localPart.toLowerCase();
    
    for (const pattern of this.patterns) {
      const expectedLocal = pattern
        .replace('{first}', first)
        .replace('{last}', last)
        .replace('{f}', f)
        .replace('{l}', l)
        .replace('@{domain}', '');
        
      if (expectedLocal === localLower) {
        return pattern;
      }
    }
    
    return null;
  }

  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    return emailRegex.test(email);
  }

  extractDomainFromWebsite(website?: string): string | null {
    if (!website) return null;
    
    try {
      const url = new URL(website);
      return url.hostname.replace('www.', '');
    } catch {
      const cleaned = website.replace(/^(https?:\/\/)?(www\.)?/, '');
      const domainMatch = cleaned.match(/^[a-z0-9.-]+\.[a-z]{2,}/i);
      return domainMatch ? domainMatch[0] : null;
    }
  }
}