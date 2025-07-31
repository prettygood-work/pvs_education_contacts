import * as XLSX from 'xlsx';
import { District, CDEDataRow } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export class CDELoader {
  private readonly dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(process.cwd(), 'data', 'pubschls.xlsx');
  }

  async loadDistricts(): Promise<District[]> {
    if (!fs.existsSync(this.dataPath)) {
      throw new Error(`CDE data file not found at: ${this.dataPath}`);
    }

    console.log(`Loading CDE data from: ${this.dataPath}`);
    
    const workbook = XLSX.readFile(this.dataPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json<CDEDataRow>(sheet);
    
    const districtMap = new Map<string, District>();
    
    for (const row of rawData) {
      if (!row.District || !row.CDSCode) continue;
      
      const districtCode = row.CDSCode.substring(0, 7) + '0000000';
      
      if (!districtMap.has(districtCode)) {
        const district: District = {
          id: districtCode,
          cdCode: districtCode,
          name: row.District.trim(),
          county: row.County?.trim() || '',
          type: row.DOCType?.trim() || 'District',
          website: this.cleanWebsite(row.Website),
          status: 'pending'
        };
        
        districtMap.set(districtCode, district);
      }
    }
    
    const districts = Array.from(districtMap.values());
    console.log(`Loaded ${districts.length} unique districts from CDE data`);
    
    return districts;
  }

  private cleanWebsite(website?: string): string | undefined {
    if (!website || website.trim() === '') return undefined;
    
    let cleaned = website.trim().toLowerCase();
    
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    
    try {
      const url = new URL(cleaned);
      return url.href;
    } catch {
      return undefined;
    }
  }

  async loadDistrictContacts(): Promise<Map<string, any[]>> {
    if (!fs.existsSync(this.dataPath)) {
      throw new Error(`CDE data file not found at: ${this.dataPath}`);
    }

    const workbook = XLSX.readFile(this.dataPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json<CDEDataRow>(sheet);
    const contactsMap = new Map<string, any[]>();
    
    for (const row of rawData) {
      if (!row.District || !row.CDSCode) continue;
      
      const districtCode = row.CDSCode.substring(0, 7) + '0000000';
      
      if (!contactsMap.has(districtCode)) {
        contactsMap.set(districtCode, []);
      }
      
      const contacts = contactsMap.get(districtCode)!;
      
      if (row.AdmFName1 && row.AdmLName1) {
        contacts.push({
          firstName: row.AdmFName1.trim(),
          lastName: row.AdmLName1.trim(),
          email: row.AdmEmail1?.trim(),
          title: 'Administrator',
          source: 'CDE'
        });
      }
      
      if (row.AdmFName2 && row.AdmLName2) {
        contacts.push({
          firstName: row.AdmFName2.trim(),
          lastName: row.AdmLName2.trim(),
          email: row.AdmEmail2?.trim(),
          title: 'Administrator',
          source: 'CDE'
        });
      }
      
      if (row.AdmFName3 && row.AdmLName3) {
        contacts.push({
          firstName: row.AdmFName3.trim(),
          lastName: row.AdmLName3.trim(),
          email: row.AdmEmail3?.trim(),
          title: 'Administrator',
          source: 'CDE'
        });
      }
    }
    
    return contactsMap;
  }
}