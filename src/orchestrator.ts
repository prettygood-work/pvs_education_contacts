import pLimit from 'p-limit';
import { District, DistrictContacts, Contact, EmailStatus } from './types';
import { config } from './config';
import { CDELoader } from './loaders/cdeLoader';
import { PlaywrightScraper } from './scrapers/playwrightScraper';
import { EmailGenerator } from './processors/emailGenerator';
import { EmailVerifier } from './processors/emailVerifier';
import { PDFProcessor } from './processors/pdfProcessor';
import { CSVExporter } from './utils/csvExporter';
import * as firebase from './utils/firebase';
import { RateLimiter } from './utils/rateLimiter';
import { ProgressTracker } from './utils/progressTracker';
import { withRetry, RetryConfigs } from './utils/retryHelper';
import logger, { logDistrictStart, logDistrictComplete, logDistrictError, logScraperEvent } from './utils/logger';
import { TemplateMatcher } from './scrapers/templateMatcher';

export class Orchestrator {
  private readonly scraper: PlaywrightScraper;
  private readonly emailGenerator: EmailGenerator;
  private readonly emailVerifier: EmailVerifier;
  private readonly pdfProcessor: PDFProcessor;
  private readonly csvExporter: CSVExporter;
  private readonly limit: any;
  private readonly rateLimiter: RateLimiter;
  private readonly templateMatcher: TemplateMatcher;
  private progressTracker!: ProgressTracker;
  private startTime: number = 0;

  constructor() {
    this.scraper = new PlaywrightScraper();
    this.emailGenerator = new EmailGenerator();
    this.emailVerifier = new EmailVerifier();
    this.pdfProcessor = new PDFProcessor();
    this.csvExporter = new CSVExporter();
    this.limit = pLimit(config.scraper.maxConcurrent);
    this.rateLimiter = new RateLimiter(30, 0.5); // 30 requests burst, 0.5/sec average
    this.templateMatcher = new TemplateMatcher();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing orchestrator...');
    await this.scraper.initialize();
    await this.pdfProcessor.initialize();
    const db = firebase.initializeFirebase();
    this.progressTracker = new ProgressTracker(db);
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up resources...');
    await this.scraper.close();
    await this.pdfProcessor.terminate();
  }

  async run(): Promise<void> {
    this.startTime = Date.now();
    
    try {
      await this.initialize();
      
      const districts = await this.loadOrGetDistricts();
      logger.info(`Processing ${districts.length} districts...`);
      logScraperEvent('run_started', { totalDistricts: districts.length });
      
      // Initialize progress tracking
      await this.progressTracker.initializeRun(districts.length);
      
      // Check for resume capability
      const unprocessedIds = await this.progressTracker.getUnprocessedDistricts();
      const districtsToProcess = districts.filter(d => unprocessedIds.includes(d.id));
      
      if (districtsToProcess.length < districts.length) {
        logger.info(`Resuming from previous run. ${districts.length - districtsToProcess.length} already processed.`);
      }
      
      const batchSize = 50;
      for (let i = 0; i < districtsToProcess.length; i += batchSize) {
        const batch = districtsToProcess.slice(i, i + batchSize);
        await this.processBatch(batch);
        
        const progress = await this.progressTracker.getProgress();
        if (progress) {
          logger.info(`Progress: ${progress.stats.completed}/${progress.stats.total} completed, ${progress.stats.failed} failed`);
        }
        
        if (i + batchSize < districtsToProcess.length) {
          logger.debug('Pausing between batches...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      await this.progressTracker.completeRun();
      await this.exportResults();
      
    } catch (error) {
      logger.error('Fatal error in orchestrator', error);
      await this.progressTracker.failRun(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async loadOrGetDistricts(): Promise<District[]> {
    const stats = await firebase.getProcessingStats();
    
    if (stats.total === 0) {
      console.log('No districts in Firebase, loading from CDE data...');
      const loader = new CDELoader();
      const districts = await loader.loadDistricts();
      await firebase.saveDistricts(districts);
      return districts;
    }
    
    return firebase.getPendingDistricts();
  }

  private async processBatch(districts: District[]): Promise<void> {
    const promises = districts.map(district =>
      this.limit(async () => {
        try {
          await this.processDistrict(district);
        } catch (error) {
          console.error(`Error processing ${district.name}:`, error);
        }
      })
    );
    
    await Promise.all(promises);
  }

  private async processDistrict(district: District): Promise<void> {
    const districtStartTime = Date.now();
    logDistrictStart(district.id, district.name);
    
    try {
      // Check if already processed in this run
      if (await this.progressTracker.isDistrictProcessed(district.id)) {
        logger.info(`Skipping already processed district: ${district.name}`);
        return;
      }
      
      await this.progressTracker.startDistrict(district);
      await firebase.updateDistrictStatus(district.id, 'processing');
      
      // Apply rate limiting
      await this.rateLimiter.waitForToken(district.website);
      
      const domain = this.emailGenerator.extractDomainFromWebsite(district.website);
      let contacts: Contact[] = [];
      
      if (district.website) {
        try {
          // Scrape with retry logic
          contacts = await withRetry(
            async () => await this.scraper.scrapeDistrict(district),
            RetryConfigs.network
          );
        } catch (error: any) {
          if (error.message === 'CAPTCHA_DETECTED') {
            console.log(`CAPTCHA detected for ${district.name}, using department emails`);
            if (domain) {
              const deptEmails = this.emailGenerator.generateDepartmentEmails(domain);
              contacts = deptEmails.map(email => ({
                firstName: 'Department',
                lastName: 'Contact',
                title: 'General Contact',
                email,
                confidence: 60
              }));
            }
          } else {
            throw error;
          }
        }
      }
      
      const loader = new CDELoader();
      const cdeContacts = await loader.loadDistrictContacts();
      const districtCDEContacts = cdeContacts.get(district.id) || [];
      
      if (districtCDEContacts.length > 0) {
        contacts.push(...districtCDEContacts.map(c => ({
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title || 'Administrator',
          email: c.email,
          emailStatus: 'unverified' as EmailStatus,
          confidence: 100
        })));
      }
      
      if (domain && contacts.filter(c => c.email).length < 3) {
        const pattern = this.emailGenerator.inferPatternFromKnownEmails(contacts);
        
        for (const contact of contacts) {
          if (!contact.email && contact.firstName && contact.lastName) {
            const generatedEmails = pattern 
              ? [pattern.replace('{first}', contact.firstName.toLowerCase())
                  .replace('{last}', contact.lastName.toLowerCase())
                  .replace('{f}', contact.firstName[0].toLowerCase())
                  .replace('{l}', contact.lastName[0].toLowerCase())
                  .replace('{domain}', domain)]
              : this.emailGenerator.generateEmails(
                  contact.firstName,
                  contact.lastName,
                  domain
                );
            
            if (generatedEmails.length > 0) {
              contact.email = generatedEmails[0];
              contact.emailStatus = 'generated';
            }
          }
        }
      }
      
      const emailsToVerify = contacts
        .filter(c => c.email && !c.emailStatus)
        .map(c => c.email!);
      
      if (emailsToVerify.length > 0) {
        const verificationResults = await this.emailVerifier.verifyBatch(emailsToVerify);
        
        for (const contact of contacts) {
          if (contact.email && verificationResults.has(contact.email)) {
            contact.emailStatus = verificationResults.get(contact.email);
          }
        }
        
        const greylistedEmails = Array.from(verificationResults.entries())
          .filter(([_, status]) => status === 'greylist_retry')
          .map(([email, _]) => email);
        
        if (greylistedEmails.length > 0) {
          const retryResults = await this.emailVerifier.retryGreylisted(greylistedEmails);
          
          for (const contact of contacts) {
            if (contact.email && retryResults.has(contact.email)) {
              contact.emailStatus = retryResults.get(contact.email);
            }
          }
        }
      }
      
      const districtContacts: DistrictContacts = {
        districtId: district.id,
        districtName: district.name,
        county: district.county,
        website: district.website,
        contacts: contacts,
        scrapedAt: new Date()
      };
      
      await withRetry(
        async () => await firebase.saveDistrictContacts(districtContacts),
        RetryConfigs.database
      );
      
      await firebase.updateDistrictStatus(district.id, 'completed');
      
      const duration = Date.now() - districtStartTime;
      await this.progressTracker.completeDistrict(district, contacts.length, {
        domain,
        verifiedEmails: contacts.filter(c => c.emailStatus === 'verified').length,
        generatedEmails: contacts.filter(c => c.emailStatus === 'generated').length,
      });
      
      logDistrictComplete(district.id, district.name, contacts.length, duration);
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logDistrictError(district.id, district.name, error);
      
      await this.progressTracker.failDistrict(district, errorMessage);
      await firebase.updateDistrictStatus(district.id, 'failed', errorMessage);
      
      // Don't throw - continue with next district
    }
  }

  private async exportResults(): Promise<void> {
    console.log('Exporting results...');
    
    const allContacts = await firebase.getAllDistrictContacts();
    const stats = await firebase.getProcessingStats();
    
    await this.csvExporter.exportContacts(allContacts);
    
    const totalContacts = allContacts.reduce((sum, dc) => sum + dc.contacts.length, 0);
    const verifiedEmails = allContacts.reduce(
      (sum, dc) => sum + dc.contacts.filter(c => c.emailStatus === 'verified').length,
      0
    );
    
    const executionTime = this.formatExecutionTime(Date.now() - this.startTime);
    
    await this.csvExporter.exportSummary({
      totalDistricts: stats.total,
      totalContacts,
      verifiedEmails,
      districtsCovered: stats.completed,
      executionTime
    });
    
    console.log(`
=== Scraping Complete ===
Total Contacts: ${totalContacts}
Verified Emails: ${verifiedEmails}
Districts Covered: ${stats.completed}/${stats.total}
Execution Time: ${executionTime}

Done! Check output/contacts.csv
    `);
  }

  private formatExecutionTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}