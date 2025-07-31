import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    clientId: process.env.FIREBASE_CLIENT_ID!,
    authUri: process.env.FIREBASE_AUTH_URI!,
    tokenUri: process.env.FIREBASE_TOKEN_URI!,
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL!,
    clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL!
  },
  smtp: {
    verifySender: process.env.SMTP_VERIFY_SENDER || 'verify@platinumvisual.com'
  },
  scraper: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_SCRAPERS || '5'),
    headless: process.env.HEADLESS_BROWSER !== 'false',
    timeout: 30000,
    maxRetries: 3
  },
  paths: {
    cdeData: process.env.CDE_DATA_PATH || './data/pubschls.xlsx',
    outputDir: './output',
    outputFile: './output/contacts.csv'
  }
};

export function validateConfig(): void {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}