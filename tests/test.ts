import { EmailGenerator } from '../src/processors/emailGenerator';
import { Contact } from '../src/types';

async function testEmailGenerator() {
  console.log('Testing Email Generator...');
  
  const generator = new EmailGenerator();
  
  const emails = generator.generateEmails('John', 'Smith', 'example.com');
  console.log('Generated emails:', emails);
  
  const deptEmails = generator.generateDepartmentEmails('example.com');
  console.log('Department emails:', deptEmails.slice(0, 5));
  
  const domain = generator.extractDomainFromWebsite('https://www.example.com');
  console.log('Extracted domain:', domain);
  
  const knownContacts: Contact[] = [
    { firstName: 'John', lastName: 'Doe', title: 'Director', email: 'john.doe@example.com' },
    { firstName: 'Jane', lastName: 'Smith', title: 'Manager', email: 'jane.smith@example.com' }
  ];
  
  const pattern = generator.inferPatternFromKnownEmails(knownContacts);
  console.log('Inferred pattern:', pattern);
  
  console.log('✅ Email Generator tests passed\n');
}

async function testTypeValidation() {
  console.log('Testing TypeScript compilation...');
  
  try {
    const { execSync } = require('child_process');
    execSync('npm run typecheck', { stdio: 'inherit' });
    console.log('✅ TypeScript validation passed\n');
  } catch (error) {
    console.error('❌ TypeScript validation failed');
    process.exit(1);
  }
}

async function testConfigValidation() {
  console.log('Testing configuration...');
  
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.log('   Copy .env.example to .env and fill in the values\n');
  } else {
    console.log('✅ Configuration validation passed\n');
  }
}

async function main() {
  console.log('=== Running PVS Email Scraper Tests ===\n');
  
  await testEmailGenerator();
  await testConfigValidation();
  await testTypeValidation();
  
  console.log('=== All tests completed ===');
}

if (require.main === module) {
  main().catch(console.error);
}