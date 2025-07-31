export interface District {
  id: string;
  cdCode: string;
  name: string;
  county: string;
  type: string;
  website?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  error?: string;
}

export interface Contact {
  firstName: string;
  lastName: string;
  title: string;
  email?: string;
  emailStatus?: EmailStatus;
  department?: string;
  phone?: string;
  confidence?: number;
}

export interface DistrictContacts {
  districtId: string;
  districtName: string;
  county: string;
  website?: string;
  contacts: Contact[];
  scrapedAt: Date;
}

export type EmailStatus = 
  | 'verified'
  | 'invalid'
  | 'greylist_retry'
  | 'unverified'
  | 'generated';

export interface EmailPattern {
  pattern: string;
  examples: string[];
  frequency: number;
}

export interface ScraperOptions {
  headless?: boolean;
  timeout?: number;
  maxRetries?: number;
}

export interface PDFProcessingResult {
  text: string;
  contacts: Contact[];
  wasOCR: boolean;
}

export interface CDEDataRow {
  CDSCode: string;
  NCESDist: string;
  NCESSchool: string;
  StatusType: string;
  County: string;
  District: string;
  School: string;
  Street: string;
  StreetAbr: string;
  City: string;
  Zip: string;
  State: string;
  MailStreet: string;
  MailStrAbr: string;
  MailCity: string;
  MailZip: string;
  MailState: string;
  Phone: string;
  Ext: string;
  Website: string;
  OpenDate: string;
  ClosedDate: string;
  Charter: string;
  CharterNum: string;
  FundingType: string;
  DOC: string;
  DOCType: string;
  SOC: string;
  SOCType: string;
  EdOpsCode: string;
  EdOpsName: string;
  EILCode: string;
  EILName: string;
  GSoffered: string;
  GSserved: string;
  Virtual: string;
  Magnet: string;
  Latitude: string;
  Longitude: string;
  AdmFName1: string;
  AdmLName1: string;
  AdmEmail1: string;
  AdmFName2: string;
  AdmLName2: string;
  AdmEmail2: string;
  AdmFName3: string;
  AdmLName3: string;
  AdmEmail3: string;
  LastUpdate: string;
}