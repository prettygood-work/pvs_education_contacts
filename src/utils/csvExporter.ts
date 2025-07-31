import { createObjectCsvWriter } from 'csv-writer';
import { DistrictContacts } from '../types';
import { config } from '../config';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface CSVRow {
  District: string;
  County: string;
  FirstName: string;
  LastName: string;
  Title: string;
  Email: string;
  EmailStatus: string;
  Department: string;
  Phone: string;
  Website: string;
  Confidence: number;
  ScrapedAt: string;
}

export class CSVExporter {
  private readonly outputPath: string;

  constructor(outputPath?: string) {
    this.outputPath = outputPath || config.paths.outputFile;
  }

  async exportContacts(allDistrictContacts: DistrictContacts[]): Promise<string> {
    await this.ensureOutputDirectory();
    
    const rows: CSVRow[] = [];
    
    for (const districtData of allDistrictContacts) {
      for (const contact of districtData.contacts) {
        rows.push({
          District: districtData.districtName,
          County: districtData.county,
          FirstName: contact.firstName || '',
          LastName: contact.lastName || '',
          Title: contact.title || '',
          Email: contact.email || '',
          EmailStatus: contact.emailStatus || 'unverified',
          Department: contact.department || '',
          Phone: contact.phone || '',
          Website: districtData.website || '',
          Confidence: contact.confidence || 0,
          ScrapedAt: districtData.scrapedAt.toISOString()
        });
      }
    }
    
    const csvWriter = createObjectCsvWriter({
      path: this.outputPath,
      header: [
        { id: 'District', title: 'District' },
        { id: 'County', title: 'County' },
        { id: 'FirstName', title: 'FirstName' },
        { id: 'LastName', title: 'LastName' },
        { id: 'Title', title: 'Title' },
        { id: 'Email', title: 'Email' },
        { id: 'EmailStatus', title: 'EmailStatus' },
        { id: 'Department', title: 'Department' },
        { id: 'Phone', title: 'Phone' },
        { id: 'Website', title: 'Website' },
        { id: 'Confidence', title: 'Confidence' },
        { id: 'ScrapedAt', title: 'ScrapedAt' }
      ]
    });
    
    await csvWriter.writeRecords(rows);
    
    console.log(`Exported ${rows.length} contacts to ${this.outputPath}`);
    return this.outputPath;
  }

  async exportSummary(stats: {
    totalDistricts: number;
    totalContacts: number;
    verifiedEmails: number;
    districtsCovered: number;
    executionTime: string;
  }): Promise<void> {
    const summaryPath = path.join(
      path.dirname(this.outputPath),
      'summary.txt'
    );
    
    const summary = `
=== PVS Email Scraper Summary ===
Generated: ${new Date().toISOString()}

Total Districts: ${stats.totalDistricts}
Districts Covered: ${stats.districtsCovered}
Total Contacts: ${stats.totalContacts}
Verified Emails: ${stats.verifiedEmails}
Execution Time: ${stats.executionTime}

Output File: ${this.outputPath}
`;
    
    await fs.writeFile(summaryPath, summary);
    console.log(`Summary written to ${summaryPath}`);
  }

  private async ensureOutputDirectory(): Promise<void> {
    const dir = path.dirname(this.outputPath);
    await fs.mkdir(dir, { recursive: true });
  }

  async exportFailedDistricts(failedDistricts: Array<{
    name: string;
    error: string;
  }>): Promise<void> {
    if (failedDistricts.length === 0) return;
    
    const failedPath = path.join(
      path.dirname(this.outputPath),
      'failed_districts.csv'
    );
    
    const csvWriter = createObjectCsvWriter({
      path: failedPath,
      header: [
        { id: 'name', title: 'District' },
        { id: 'error', title: 'Error' }
      ]
    });
    
    await csvWriter.writeRecords(failedDistricts);
    console.log(`Failed districts written to ${failedPath}`);
  }
}