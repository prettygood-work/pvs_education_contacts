import { Page } from 'playwright';

export interface Template {
  name: string;
  confidence: number;
  selectors: {
    staffDirectory?: string[];
    contactPage?: string[];
    nameSelectors?: string[];
    emailSelectors?: string[];
    titleSelectors?: string[];
    phoneSelectors?: string[];
  };
}

/**
 * Detects common CMS patterns and returns appropriate selectors
 */
export class TemplateMatcher {
  private readonly templates: Map<string, Template>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Finalsite template
    this.templates.set('finalsite', {
      name: 'Finalsite',
      confidence: 0,
      selectors: {
        staffDirectory: [
          'a[href*="/staff"]',
          'a[href*="/directory"]',
          'a[href*="/our-staff"]',
          '.fs-staff-directory',
        ],
        contactPage: ['a[href*="/contact"]', 'a[href*="/about"]'],
        nameSelectors: ['.fs-staff-name', '.staff-name', 'h3.name'],
        emailSelectors: ['.fs-staff-email', 'a[href^="mailto:"]'],
        titleSelectors: ['.fs-staff-title', '.staff-title', '.position'],
        phoneSelectors: ['.fs-staff-phone', '.phone', 'a[href^="tel:"]'],
      },
    });

    // Schoolwires/Blackboard template
    this.templates.set('schoolwires', {
      name: 'Schoolwires',
      confidence: 0,
      selectors: {
        staffDirectory: [
          'a[href*="Domain/"][href*="staff"]',
          'a[href*="/Page/"][href*="staff"]',
          '.sw-directory-link',
        ],
        contactPage: ['a[href*="/Domain/"][href*="contact"]'],
        nameSelectors: ['.sw-staff-name', '.ui-article-title'],
        emailSelectors: ['a.mailto', 'a[href^="mailto:"]'],
        titleSelectors: ['.sw-staff-title', '.ui-article-subtitle'],
        phoneSelectors: ['.sw-phone', 'span.phone'],
      },
    });

    // WordPress template
    this.templates.set('wordpress', {
      name: 'WordPress',
      confidence: 0,
      selectors: {
        staffDirectory: [
          'a[href*="/staff"]',
          'a[href*="/team"]',
          'a[href*="/directory"]',
          '.menu-item a[href*="staff"]',
        ],
        contactPage: [
          'a[href*="/contact"]',
          '.menu-item a[href*="contact"]',
        ],
        nameSelectors: ['.staff-member-name', '.team-member h3', 'h3.name'],
        emailSelectors: ['.staff-email', 'a[href^="mailto:"]'],
        titleSelectors: ['.staff-position', '.team-member-title', '.role'],
        phoneSelectors: ['.staff-phone', 'a[href^="tel:"]'],
      },
    });

    // Generic template (fallback)
    this.templates.set('generic', {
      name: 'Generic',
      confidence: 0,
      selectors: {
        staffDirectory: [
          'a[href*="staff"]',
          'a[href*="directory"]',
          'a[href*="contact"]',
          'a[href*="about"]',
          'a[href*="administration"]',
          'a[href*="leadership"]',
        ],
        nameSelectors: [
          'h1', 'h2', 'h3', 'h4',
          '.name', '.staff-name',
          '[class*="name"]',
        ],
        emailSelectors: ['a[href^="mailto:"]', '[href*="@"]'],
        titleSelectors: [
          '.title', '.position', '.role',
          '[class*="title"]', '[class*="position"]',
        ],
        phoneSelectors: [
          'a[href^="tel:"]',
          '[href^="tel:"]',
          '.phone', '[class*="phone"]',
        ],
      },
    });
  }

  /**
   * Analyzes a page to determine which CMS template it uses
   */
  async matchTemplate(page: Page): Promise<Template> {
    const pageContent = await page.content();
    const url = page.url();

    // Reset confidence scores
    for (const template of this.templates.values()) {
      template.confidence = 0;
    }

    // Check for Finalsite markers
    if (
      pageContent.includes('finalsite') ||
      pageContent.includes('fs-') ||
      url.includes('finalsite')
    ) {
      this.templates.get('finalsite')!.confidence += 50;
    }

    // Check for Schoolwires/Blackboard markers
    if (
      pageContent.includes('schoolwires') ||
      pageContent.includes('blackboard') ||
      pageContent.includes('/cms/') ||
      pageContent.includes('sw-')
    ) {
      this.templates.get('schoolwires')!.confidence += 50;
    }

    // Check for WordPress markers
    if (
      pageContent.includes('wp-content') ||
      pageContent.includes('wp-includes') ||
      pageContent.includes('wordpress')
    ) {
      this.templates.get('wordpress')!.confidence += 50;
    }

    // Check for specific CSS classes and structures
    const finalsiteClasses = await page.$$('.fs-staff-member, .finalsite-container');
    if (finalsiteClasses.length > 0) {
      this.templates.get('finalsite')!.confidence += 30;
    }

    const schoolwiresClasses = await page.$$('.sw-channel, .ui-widget');
    if (schoolwiresClasses.length > 0) {
      this.templates.get('schoolwires')!.confidence += 30;
    }

    const wpClasses = await page.$$('.wp-block, .entry-content');
    if (wpClasses.length > 0) {
      this.templates.get('wordpress')!.confidence += 30;
    }

    // Find the template with highest confidence
    let bestTemplate = this.templates.get('generic')!;
    let highestConfidence = 0;

    for (const template of this.templates.values()) {
      if (template.confidence > highestConfidence && template.name !== 'Generic') {
        highestConfidence = template.confidence;
        bestTemplate = template;
      }
    }

    // If no specific template matched well, use generic
    if (highestConfidence < 30) {
      bestTemplate = this.templates.get('generic')!;
      bestTemplate.confidence = 100; // Generic always works
    }

    console.log(`Detected template: ${bestTemplate.name} (confidence: ${bestTemplate.confidence})`);
    return bestTemplate;
  }

  /**
   * Gets a specific template by name
   */
  getTemplate(name: string): Template | undefined {
    return this.templates.get(name.toLowerCase());
  }

  /**
   * Lists all available templates
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}