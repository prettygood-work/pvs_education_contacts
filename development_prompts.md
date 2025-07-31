# PVS Email Scraper - One-Time Scraper Claude Code Prompts

## Prompt 1: Standalone Scraper Foundation

**Exact Deliverables**:

- Standalone Node.js 18 script with TypeScript
- Firebase integration for data storage only (no monitoring)
- In-memory rate limiting and queue management
- Simple console progress logging
- CSV export functionality built-in

**Success Metrics**:

- Runs as single CLI command: `npm run scrape`
- No external dependencies on Cloud Functions/Tasks
- Completes full run without timeouts
- Exports clean CSV at completion
- Zero recurring operations

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Building ONE-TIME scraper for 1,060 CA districts. Runs once on workstation or Cloud Run job, exports to CSV, then project complete. No monitoring, no retries, no recurring operations.

DEVELOPMENT STANDARDS:
* Language: TypeScript with Node.js 18
* Execution: Standalone CLI script
* Storage: Firebase for results only
* Output: CSV export + console logs
* No recurring operations or monitors

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Create standalone Node.js project
    * Setup Firebase Admin SDK for storage
    * Configure in-memory rate limiter
    * Build simple progress logger
    
2. Core Implementation
    * Main script with p-limit concurrency
    * Firebase writes for permanent storage
    * In-memory queue management
    * Console progress updates
    * CSV export on completion
    
3. Quality Assurance
    * Test single execution flow
    * Verify CSV export format
    * Check memory usage
    * Validate completion
    
4. Deployment Preparation
    * Create run instructions
    * Document CSV format
    * Package as portable script
    * No CI/CD needed

CODE QUALITY REQUIREMENTS:
* Single entry point: src/index.ts
* All operations in-memory except Firebase storage
* No scheduled functions or triggers
* Progress logged to console only
* Clean shutdown on completion

TESTING REQUIREMENTS:
* Test with 10 districts locally
* Verify CSV export
* Check memory usage
* Validate Firebase writes
* No ongoing test suites needed

SECURITY CHECKLIST:
* [x] Firebase service account local only
* [x] No public endpoints
* [x] No recurring credentials
* [x] CSV stored locally
* [x] One-time execution
* [x] No monitoring exposure

SELF-VALIDATION PROTOCOL:
1. Run `npm run scrape:test` with 10 districts
2. Check CSV output
3. Verify Firebase data
4. Confirm script exits cleanly
5. No background processes remain

OUTPUT: Standalone scraper that runs once and exports CSV
```

**Review Checkpoint**: One-Time Execution Validation

- **Criteria**: Script runs once, exports CSV, exits cleanly
- **Gate**: Test run completes, no recurring processes
- **Self-Correction**: If any schedulers found, remove them

---

## Prompt 2: CDE Data Loader with Firebase Storage

**Exact Deliverables**:

- Excel parser that loads CDE data into memory
- One-time Firebase write of district records
- No status tracking for re-runs
- Simple validation and statistics
- Districts marked as 'pending' once only

**Success Metrics**:

- Parse 1,060 districts in <10 seconds
- Single batch write to Firebase
- No re-scraping logic included
- Memory-efficient processing
- Clear completion message

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Load CDE Excel data ONCE into Firebase. Districts get 'pending' status for single scrape run. No retry logic or status management for re-runs.

DEVELOPMENT STANDARDS:
* Language: TypeScript with xlsx
* Storage: Firebase batch write once
* Status: Simple 'pending' flag only
* No retry or re-run tracking
* Memory-first processing

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Load Excel file into memory
    * Parse and validate districts
    * Prepare for Firebase batch
    * No status management complexity
    
2. Core Implementation
    * Stream Excel parsing
    * Build district objects
    * Single Firebase batch write
    * Log statistics to console
    * Mark all as 'pending'
    
3. Quality Assurance
    * Verify all 1,060 loaded
    * Check required fields
    * Validate Firebase write
    * Memory usage acceptable
    
4. Deployment Preparation
    * Document Excel format
    * Note one-time nature
    * No scheduling needed
    * Simple error handling

FIREBASE SCHEMA (Simplified):
/districts/{districtId}
  - name: string
  - county: string  
  - website: string
  - superintendent: object
  - cdsCode: string
  - status: 'pending' // Never changes after initial load
  - loadedAt: Timestamp

CODE QUALITY REQUIREMENTS:
* Single-use loader function
* No complex status management
* Batch operations only
* Console logging for progress
* Exit after completion

TESTING REQUIREMENTS:
* Load test Excel file
* Verify Firebase write
* Check memory usage
* Confirm one-time execution
* No retry logic present

SECURITY CHECKLIST:
* [x] Local file access only
* [x] Service account protected
* [x] No recurring loads
* [x] One-time write operation
* [x] No status webhooks
* [x] Simple validation only

SELF-VALIDATION PROTOCOL:
1. Run loader once
2. Verify 1,060 districts in Firebase
3. All marked as 'pending'
4. Script exits completely
5. No scheduled reloads

OUTPUT: One-time CDE data load to Firebase
```

**Review Checkpoint**: Single Load Validation

- **Criteria**: Data loaded once, no reload logic, clean exit
- **Gate**: 1,060 districts in Firebase, all pending
- **Self-Correction**: Remove any retry or reload code

---

## Prompt 3: Email Pattern Detection (Memory-Based)

**Exact Deliverables**:

- In-memory pattern detection engine
- Pattern matching for email generation
- No Firebase pattern storage/learning
- Simple confidence scoring
- Department email list generation

**Success Metrics**:

- Pattern detection in <10ms per district
- Generate 10+ email variations per contact
- No external API calls
- Memory-only processing
- High-confidence patterns only

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist  
CONTEXT: Generate likely emails using pattern matching. All processing in-memory during single run. No learning system or pattern persistence needed.

DEVELOPMENT STANDARDS:
* Language: TypeScript functional style
* Processing: Memory-only patterns
* No external storage
* No learning/updates
* Deterministic output

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Define common K12 patterns
    * Build pattern matcher
    * Create email generator
    * Department email templates
    
2. Core Implementation
    * Pattern detection from samples
    * Generate email variations
    * Score by likelihood
    * Add department emails
    * Return all candidates
    
3. Quality Assurance
    * Test pattern accuracy
    * Verify email formats
    * Check generation speed
    * Validate variations
    
4. Deployment Preparation
    * Document patterns
    * List departments
    * Note assumptions
    * Package with main script

PATTERN TEMPLATES:
const patterns = [
  '{first}.{last}@{domain}',
  '{f}{last}@{domain}', 
  '{first}_{last}@{domain}',
  '{last}{f}@{domain}',
  '{first}@{domain}'
];

const departments = [
  'superintendent@{domain}',
  'facilities@{domain}',
  'maintenance@{domain}',
  'purchasing@{domain}',
  'business@{domain}'
];

CODE QUALITY REQUIREMENTS:
* Pure functions only
* No side effects
* No external calls
* Deterministic results
* Fast execution

TESTING REQUIREMENTS:
* Unit tests for patterns
* Verify email formats
* Test edge cases
* Check performance
* No integration tests

SECURITY CHECKLIST:
* [x] No external API usage
* [x] No data persistence
* [x] Input validation only
* [x] Memory-safe operations
* [x] No learning storage
* [x] Deterministic output

SELF-VALIDATION PROTOCOL:
1. Generate emails for test names
2. Verify format validity
3. Check pattern matching
4. Confirm memory-only
5. No external connections

OUTPUT: Memory-based email pattern generator
```

**Review Checkpoint**: Memory-Only Validation

- **Criteria**: No external calls, no persistence, fast generation
- **Gate**: Patterns work offline, deterministic output
- **Self-Correction**: Remove any API or storage calls

---

## Prompt 4: SMTP Email Verification with p-limit

**Exact Deliverables**:

- SMTP verifier using mailauth library
- In-memory queue with p-limit (5 concurrent)
- No Cloud Tasks or Pub/Sub
- Simple retry for greylisting (in same run)
- Results updated directly in Firebase

**Success Metrics**:

- Verify emails at 5 concurrent connections
- Handle greylisting with simple retry
- No external queue services
- Complete in single execution
- Accurate SMTP verification (not just MX)

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Verify emails via SMTP in single run. Use p-limit for concurrency control. No Cloud Tasks. Retry greylisting within same execution. Mark 'verified' only on SMTP 250 response.

DEVELOPMENT STANDARDS:
* Language: TypeScript with mailauth
* Concurrency: p-limit (5 parallel)
* Queue: In-memory only
* Verification: Full SMTP check
* No external queues

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Configure mailauth correctly
    * Setup p-limit(5)
    * Create retry queue
    * No Cloud Tasks
    
2. Core Implementation
    * SMTP verification function
    * Check RCPT TO response
    * Handle greylist in-memory
    * Update Firebase directly
    * Log progress to console
    
3. Quality Assurance
    * Test SMTP responses
    * Verify concurrency limit
    * Check greylist handling
    * Monitor rate limits
    
4. Deployment Preparation
    * Document SMTP setup
    * Note verification rules
    * Package with main script
    * No queue infrastructure

VERIFICATION LOGIC:
async function verifyEmail(email: string): Promise<EmailStatus> {
  try {
    const result = await mailauth.authenticate(email, {
      sender: 'verify@platinumvisual.com',
      validateMx: true,
      validateSMTP: true
    });
    
    // Only mark verified on explicit SMTP 250
    if (result.smtp?.code === 250) {
      return 'verified';
    } else if (result.smtp?.code === 421 || result.smtp?.code === 450) {
      return 'greylist_retry'; // Retry in 15 min
    } else {
      return 'invalid';
    }
  } catch (error) {
    return 'invalid';
  }
}

CODE QUALITY REQUIREMENTS:
* Clear SMTP response handling
* No "verified" without SMTP 250
* In-memory retry queue
* Rate limiting built-in
* Direct Firebase updates

TESTING REQUIREMENTS:
* Mock SMTP responses
* Test concurrency limits
* Verify greylist retry
* Check rate limiting
* No external queues

SECURITY CHECKLIST:
* [x] SMTP credentials secure
* [x] Rate limits enforced
* [x] No queue exposure
* [x] Single execution only
* [x] No persistent retries
* [x] Clean verification rules

SELF-VALIDATION PROTOCOL:
1. Verify test emails
2. Check SMTP responses
3. Confirm p-limit working
4. Test greylist retry
5. No external queues used

OUTPUT: In-memory SMTP verifier with proper validation
```

**Review Checkpoint**: SMTP Accuracy Validation

- **Criteria**: Only SMTP 250 = verified, p-limit controls concurrency
- **Gate**: Accurate verification, no external queues
- **Self-Correction**: Fix any loose verification logic

---

## Prompt 5: Standalone Playwright Scraper Script

**Exact Deliverables**:

- Standalone Node.js script with Playwright
- Runs on workstation or Cloud Run job
- No Cloud Functions (avoids 540s timeout)
- p-limit for concurrent scraping (5 max)
- Direct Firebase updates

**Success Metrics**:

- Run continuously for 12+ hours
- No timeout issues
- Handle 1,060 districts
- Memory stable under 4GB
- Complete without restarts

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Build STANDALONE Playwright scraper script. Runs on workstation or Cloud Run job with NO timeout limits. Not a Cloud Function. Uses p-limit for concurrency.

DEVELOPMENT STANDARDS:
* Language: TypeScript + Playwright
* Execution: Standalone Node.js script
* Concurrency: p-limit (5 browsers)
* Runtime: 12+ hours OK
* No serverless functions

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Standalone Node.js app
    * Playwright with stealth
    * p-limit concurrency
    * Direct Firebase writes
    
2. Core Implementation
    * Main scraping loop
    * Browser pool management
    * Multi-strategy extraction
    * Screenshot on success
    * Progress to console
    
3. Quality Assurance
    * Test long runtime
    * Monitor memory usage
    * Check browser cleanup
    * Verify extraction
    
4. Deployment Preparation
    * Document run command
    * Note resource needs
    * Package as portable
    * Cloud Run job option

SCRAPER ARCHITECTURE:
#!/usr/bin/env node
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import pLimit from 'p-limit';

// Configure for long-running execution
chromium.use(StealthPlugin());

const limit = pLimit(5); // Max 5 concurrent browsers
const districts = await loadDistrictsFromFirebase();

// Main execution - runs for hours
for (const batch of chunks(districts, 50)) {
  await Promise.all(
    batch.map(district => 
      limit(() => scrapeDistrict(district))
    )
  );
  
  console.log(`Processed ${batch.length} districts`);
  await delay(5000); // Brief pause between batches
}

CODE QUALITY REQUIREMENTS:
* Long-running process safe
* Proper browser cleanup
* Memory leak prevention
* Progress logging
* Graceful shutdown

TESTING REQUIREMENTS:
* Run for 1+ hours locally
* Monitor memory usage
* Check browser disposal
* Verify Firebase updates
* Test on 50 districts

SECURITY CHECKLIST:
* [x] Robots.txt compliance
* [x] User agent rotation
* [x] Rate limiting
* [x] No credentials scraped
* [x] Screenshot privacy
* [x] Single execution

SELF-VALIDATION PROTOCOL:
1. Run for 2 hours minimum
2. Memory stays under 4GB
3. No browser zombies
4. Progress logged clearly
5. Firebase updated correctly

OUTPUT: Standalone scraper for 12+ hour execution
```

**Review Checkpoint**: Long Runtime Validation

- **Criteria**: Runs 12+ hours, no timeouts, stable memory
- **Gate**: 100 district test without restarts
- **Self-Correction**: Fix any memory leaks or timeouts

---

## Prompt 6: PDF Processor with OCR Fallback

**Exact Deliverables**:

- PDF processor with pdf-parse primary
- Tesseract.js OCR fallback for scanned PDFs
- Automatic detection of empty text
- Contact extraction from both paths
- In-memory processing only

**Success Metrics**:

- Extract text from 95% of PDFs
- OCR triggers on scanned documents
- Process PDFs up to 50MB
- Extract structured contacts
- No external OCR APIs

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Extract contacts from PDFs with OCR fallback. Many districts use scanned PDFs. Must use Tesseract.js when pdf-parse returns empty.

DEVELOPMENT STANDARDS:
* Language: TypeScript
* Primary: pdf-parse library
* Fallback: Tesseract.js OCR
* Processing: In-memory
* No external APIs

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Install pdf-parse
    * Install Tesseract.js
    * Setup OCR workers
    * Configure languages
    
2. Core Implementation
    * Try pdf-parse first
    * Detect empty text
    * Trigger OCR fallback
    * Extract contacts
    * Handle both paths
    
3. Quality Assurance
    * Test scanned PDFs
    * Verify OCR triggers
    * Check accuracy
    * Monitor performance
    
4. Deployment Preparation
    * Bundle OCR data
    * Document patterns
    * Note performance
    * Package workers

PDF PROCESSING LOGIC:
async function processPDF(buffer: Buffer): Promise<Contact[]> {
  // Step 1: Try text extraction
  let textContent = '';
  try {
    const data = await pdfParse(buffer);
    textContent = data.text || '';
  } catch (error) {
    console.log('PDF parse failed, will try OCR');
  }
  
  // Step 2: Check if OCR needed
  const needsOCR = !textContent || 
                   textContent.length < 100 || 
                   !hasReadableText(textContent);
  
  if (needsOCR) {
    console.log('Empty/scanned PDF detected, running OCR...');
    
    // Convert PDF to images and OCR
    const pages = await pdfToImages(buffer);
    const ocrPromises = pages.map(page => 
      Tesseract.recognize(page, 'eng', {
        logger: m => console.log(m.progress)
      })
    );
    
    const ocrResults = await Promise.all(ocrPromises);
    textContent = ocrResults.map(r => r.data.text).join('\n');
  }
  
  // Step 3: Extract contacts from text
  return extractContactsFromText(textContent);
}

CODE QUALITY REQUIREMENTS:
* Clear OCR detection logic
* Progress logging for OCR
* Memory efficient processing
* Both paths fully tested
* Graceful degradation

TESTING REQUIREMENTS:
* Test with scanned PDFs
* Verify OCR triggers
* Check text quality
* Monitor memory usage
* Both paths covered

SECURITY CHECKLIST:
* [x] PDF size limits
* [x] No external APIs
* [x] Memory bounds
* [x] Safe text parsing
* [x] Input validation
* [x] Worker cleanup

SELF-VALIDATION PROTOCOL:
1. Process 10 scanned PDFs
2. Verify OCR activated
3. Check contact extraction
4. Monitor memory usage
5. Compare both paths

OUTPUT: PDF processor with reliable OCR fallback
```

**Review Checkpoint**: OCR Integration Validation

- **Criteria**: OCR triggers on scanned PDFs, contacts extracted
- **Gate**: Successfully process scanned directories
- **Self-Correction**: Tune OCR detection thresholds

---

## Prompt 7: Simple Integration Test Suite

**Exact Deliverables**:

- Basic test suite for one-time validation
- Tests for 10 representative districts
- Memory and performance checks
- Simple pass/fail reporting
- No continuous testing infrastructure

**Success Metrics**:

- Tests complete in <30 minutes
- Cover all major components
- Identify critical issues only
- Simple console output
- One-time execution

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Create simple test suite for pre-run validation. Tests run once before main scrape. No continuous testing or monitoring needed.

DEVELOPMENT STANDARDS:
* Language: TypeScript + Jest
* Scope: Pre-run validation only
* Output: Console pass/fail
* No CI/CD integration
* One-time execution

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Basic Jest config
    * Select 10 test districts
    * Simple test structure
    * Console reporting
    
2. Core Implementation
    * Test each component
    * Check integrations
    * Verify outputs
    * Simple assertions
    * Clear results
    
3. Quality Assurance
    * Run complete suite
    * Check for failures
    * Verify coverage
    * Document issues
    
4. Deployment Preparation
    * Single test command
    * Clear instructions
    * No automation
    * Manual review

TEST DISTRICTS:
const testDistricts = [
  // Large districts
  'Los Angeles USD',
  'San Diego Unified',
  
  // Medium districts
  'Irvine Unified',
  'Palo Alto Unified',
  
  // Small districts  
  'Mammoth Unified',
  
  // Problem cases
  'San Francisco USD', // Cloudflare
  'Oakland Unified',   // Heavy JS
  
  // PDF districts
  'Sacramento City Unified',
  'Fresno Unified'
];

TEST SUITE:
describe('Pre-Run Validation', () => {
  test('CDE data loads correctly', async () => {
    const districts = await loadCDEData();
    expect(districts.length).toBe(1060);
  });
  
  test('Email patterns generate correctly', () => {
    const emails = generateEmails('John', 'Smith', 'test.k12.ca.us');
    expect(emails).toContain('john.smith@test.k12.ca.us');
  });
  
  test('Scraper extracts contacts', async () => {
    const contacts = await scrapeDistrict(testDistricts[0]);
    expect(contacts.length).toBeGreaterThan(0);
  });
  
  test('Memory usage acceptable', () => {
    const usage = process.memoryUsage();
    expect(usage.heapUsed).toBeLessThan(2 * 1024 * 1024 * 1024); // 2GB
  });
});

CODE QUALITY REQUIREMENTS:
* Simple test structure
* Clear pass/fail output
* No complex fixtures
* Fast execution
* Manual review only

TESTING REQUIREMENTS:
* Component validation
* Integration checks
* Memory monitoring
* Time tracking
* No automation

SECURITY CHECKLIST:
* [x] No production data
* [x] Local execution only
* [x] No credentials in tests
* [x] Simple validation
* [x] One-time run
* [x] No monitoring

SELF-VALIDATION PROTOCOL:
1. Run test suite once
2. Review all results
3. Fix any failures
4. Document issues
5. Proceed to main run

OUTPUT: Simple validation suite for pre-run check
```

**Review Checkpoint**: Test Simplicity Validation

- **Criteria**: Quick validation, no infrastructure, clear results
- **Gate**: Tests pass, ready for main run
- **Self-Correction**: Remove any complex testing infrastructure

---

## Prompt 8: Main Orchestrator Script

**Exact Deliverables**:

- Single Node.js script orchestrating all components
- In-memory queue management with p-limit
- Direct Firebase updates (no status loops)
- Progress logging to console
- CSV export on completion

**Success Metrics**:

- Single execution processes all districts
- No retry loops or status monitoring
- Completes in 8-12 hours
- Exports complete CSV
- Clean shutdown

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Build main orchestrator for ONE-TIME execution. No status loops, no retries between runs. Process all districts once, export CSV, done.

DEVELOPMENT STANDARDS:
* Language: TypeScript Node.js
* Execution: Single run to completion
* Concurrency: p-limit controls
* Output: CSV + Firebase
* No recurring logic

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Single entry point
    * Load all districts
    * Setup p-limit pools
    * Initialize Firebase
    
2. Core Implementation
    * Process districts once
    * Update Firebase directly
    * Log progress to console
    * Handle failures inline
    * Export CSV at end
    
3. Quality Assurance
    * Test full flow
    * Monitor progress
    * Check CSV output
    * Verify completion
    
4. Deployment Preparation
    * Document run command
    * Note resource needs
    * Package dependencies
    * Single execution

MAIN ORCHESTRATOR:
async function main() {
  console.log('PVS Email Scraper - Starting one-time scrape');
  
  // Load districts (already in Firebase from loader)
  const districts = await loadDistrictsFromFirebase();
  console.log(`Loaded ${districts.length} districts`);
  
  // Setup concurrency limits
  const scrapeLimit = pLimit(5);
  const verifyLimit = pLimit(5);
  
  // Process in batches for memory efficiency
  let processed = 0;
  for (const batch of chunks(districts, 50)) {
    
    // Scrape batch
    const scrapedBatch = await Promise.all(
      batch.map(district => 
        scrapeLimit(() => scrapeDistrict(district))
      )
    );
    
    // Verify emails in batch
    for (const result of scrapedBatch) {
      const verifyPromises = result.contacts.map(contact =>
        verifyLimit(() => verifyAndUpdateContact(contact))
      );
      await Promise.all(verifyPromises);
    }
    
    processed += batch.length;
    console.log(`Progress: ${processed}/${districts.length} districts`);
    
    // Brief pause between batches
    await delay(5000);
  }
  
  // Export results
  console.log('Scraping complete. Exporting to CSV...');
  await exportToCSV();
  
  console.log('Done! Check output/contacts.csv');
  process.exit(0);
}

// NO status checking, NO retry loops
// Just process once and exit

CODE QUALITY REQUIREMENTS:
* Single execution path
* No status-based loops
* Clear progress logging
* Memory efficient batching
* Clean exit on completion

TESTING REQUIREMENTS:
* Test with 50 districts
* Verify single execution
* Check CSV output
* Monitor memory
* Confirm clean exit

SECURITY CHECKLIST:
* [x] No exposed endpoints
* [x] Local execution only
* [x] Service account secure
* [x] No recurring jobs
* [x] Clean shutdown
* [x] No status webhooks

SELF-VALIDATION PROTOCOL:
1. Run with test batch
2. Verify single pass
3. Check CSV output
4. Confirm Firebase updates
5. Process exits cleanly

OUTPUT: One-time orchestrator with CSV export
```

**Review Checkpoint**: Single Execution Validation

- **Criteria**: Runs once, no retry loops, exports CSV, exits
- **Gate**: Complete execution without restarts
- **Self-Correction**: Remove any status-checking loops

---

## Prompt 9: CSV Export and Reporting

**Exact Deliverables**:

- Simple CSV exporter from Firebase data
- Standard format for CRM import
- Basic statistics in console
- No dashboards or web UI
- One-time export function

**Success Metrics**:

- Export completes in <60 seconds
- CSV format CRM-compatible
- All contacts included
- Simple statistics logged
- No complex reporting

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Export scraped data to CSV for CRM import. Simple format, no complex analytics or dashboards. Console output only.

DEVELOPMENT STANDARDS:
* Language: TypeScript
* Output: Standard CSV
* UI: Console logs only
* Analytics: Basic counts
* No web dashboards

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * CSV writer library
    * Firebase reader
    * Simple formatter
    * Console logger
    
2. Core Implementation
    * Read all contacts
    * Format for CRM
    * Write CSV file
    * Log statistics
    * Exit cleanly
    
3. Quality Assurance
    * Test CSV format
    * Verify all fields
    * Check CRM compatibility
    * Review statistics
    
4. Deployment Preparation
    * Document format
    * Note field mappings
    * Simple instructions
    * No UI needed

CSV FORMAT:
District,County,FirstName,LastName,Title,Email,EmailStatus,Department,Phone,Website,Confidence,ScrapedAt
"Los Angeles USD","Los Angeles","John","Smith","Facilities Director","john.smith@lausd.net","verified","Facilities","213-555-0100","lausd.net",95,"2024-01-20T10:30:00Z"

EXPORT FUNCTION:
async function exportToCSV() {
  // Read from Firebase
  const contacts = await getAllContactsFromFirebase();
  
  // Simple statistics
  console.log('\n=== Scraping Statistics ===');
  console.log(`Total Contacts: ${contacts.length}`);
  console.log(`Verified Emails: ${contacts.filter(c => c.emailStatus === 'verified').length}`);
  console.log(`Districts Covered: ${new Set(contacts.map(c => c.district)).size}`);
  
  // Write CSV
  const csv = new CSVWriter({
    path: 'output/contacts.csv',
    header: [
      {id: 'district', title: 'District'},
      {id: 'county', title: 'County'},
      {id: 'firstName', title: 'FirstName'},
      {id: 'lastName', title: 'LastName'},
      {id: 'title', title: 'Title'},
      {id: 'email', title: 'Email'},
      {id: 'emailStatus', title: 'EmailStatus'},
      {id: 'department', title: 'Department'},
      {id: 'phone', title: 'Phone'},
      {id: 'website', title: 'Website'},
      {id: 'confidence', title: 'Confidence'},
      {id: 'scrapedAt', title: 'ScrapedAt'}
    ]
  });
  
  await csv.writeRecords(contacts);
  console.log('\nCSV exported to: output/contacts.csv');
}

CODE QUALITY REQUIREMENTS:
* Simple, direct export
* No complex transformations
* Standard CSV format
* Console output only
* Clean completion

TESTING REQUIREMENTS:
* Export test data
* Verify CSV format
* Check field mapping
* Test with Excel
* CRM import test

SECURITY CHECKLIST:
* [x] No PII exposure
* [x] Local file only
* [x] No web endpoints
* [x] Simple permissions
* [x] No cloud storage
* [x] Clean data only

SELF-VALIDATION PROTOCOL:
1. Export test batch
2. Open in Excel
3. Check formatting
4. Verify all fields
5. Test CRM import

OUTPUT: Simple CSV export with console statistics
```

**Review Checkpoint**: Export Simplicity Validation

- **Criteria**: Direct CSV export, no complex UI, console stats only
- **Gate**: CSV opens correctly, CRM import works
- **Self-Correction**: Remove any dashboard or web UI code

---

## Prompt 10: Deployment Instructions

**Exact Deliverables**:

- Simple run instructions for workstation
- Optional Cloud Run job configuration
- No monitoring or alerting setup
- Basic troubleshooting guide
- One-time execution documentation

**Success Metrics**:

- Anyone can run with README
- No complex infrastructure
- Single command execution
- Clear completion indicators
- No ongoing operations

**Prompt Template**:

```
ROLE: Senior Full-Stack Developer + DevOps Specialist
CONTEXT: Document how to run one-time scraper. Focus on simplicity. No monitoring, no alerts, no recurring operations.

DEVELOPMENT STANDARDS:
* Platform: Local workstation primary
* Alternative: Cloud Run job
* Monitoring: Console logs only
* Alerts: None needed
* One-time execution

IMPLEMENTATION STRATEGY:
1. Foundation Setup
    * Write clear README
    * List requirements
    * Simple setup steps
    * No infrastructure
    
2. Core Implementation
    * Run instructions
    * Resource requirements
    * Expected timeline
    * Completion signs
    
3. Quality Assurance
    * Test instructions
    * Verify simplicity
    * Check completeness
    * No complexity
    
4. Deployment Preparation
    * Package everything
    * Final checklist
    * Handoff ready
    * No operations

README.md:
# PVS Email Scraper - One-Time Execution

## Requirements
- Node.js 18+
- 8GB RAM minimum
- 10GB free disk space
- Stable internet connection
- 8-12 hours runtime

## Setup (One Time)
1. Clone repository
2. Install dependencies: `npm install`
3. Add Firebase service account: `credentials/firebase-key.json`
4. Load CDE data: `npm run load-districts`

## Run Scraper (One Time)
```bash
# Test with 10 districts first
npm run test

# Run full scrape (8-12 hours)
npm run scrape

# Output will be in: output/contacts.csv
```

## What Happens

1. Loads 1,060 districts from Firebase
2. Scrapes each district website (5 concurrent)
3. Verifies emails via SMTP
4. Exports to CSV when complete
5. Script exits

## Cloud Run Alternative

```bash
# Build and deploy as job
gcloud run jobs create pvs-scraper \
  --source . \
  --task-timeout=86400 \
  --memory=4Gi \
  --parallelism=1 \
  --max-retries=0

# Execute once
gcloud run jobs execute pvs-scraper
```

## Troubleshooting

- If stops: Check logs, restart from checkpoint
- Memory issues: Reduce concurrency in config
- Network errors: Check connection, retry
- Missing data: Some districts have limited info

## Completion

- Look for "Done! Check output/contacts.csv"
- CSV file will have all contacts
- Upload to CRM
- Project complete

NO MONITORING NEEDED
NO RECURRING RUNS
ONE-TIME EXECUTION ONLY

CODE QUALITY REQUIREMENTS:

- Crystal clear instructions
- No complex setup
- Single execution focus
- Simple troubleshooting
- Clean handoff

TESTING REQUIREMENTS:

- Follow own instructions
- Verify execution
- Check output
- Confirm simplicity
- No operations

SECURITY CHECKLIST:

- [x] Service account notes
- [x] No public exposure
- [x] Local execution safe
- [x] No monitoring risks
- [x] Clean shutdown
- [x] No recurring access

SELF-VALIDATION PROTOCOL:

1. Fresh machine test
2. Follow instructions
3. Verify execution
4. Check CSV output
5. Confirm completion

OUTPUT: Simple run instructions for one-time use

```

**Review Checkpoint**: Deployment Simplicity
- **Criteria**: Anyone can run, no infrastructure, clear instructions
- **Gate**: Test on fresh environment successfully
- **Self-Correction**: Remove any complex deployment steps

---

## Master Execution Checklist

**One-Time Setup**:
```

[ ] Clone repository
[ ] Install Node.js 18+
[ ] Run npm install
[ ] Add Firebase credentials
[ ] Load CDE data once
[ ] Run validation tests

```

**Single Execution**:
```

[ ] Run: npm run scrape
[ ] Monitor console progress
[ ] Wait 8-12 hours
[ ] Check output/contacts.csv
[ ] Import to CRM
[ ] Project complete

```

**No Recurring Operations**:
- ❌ No scheduled jobs
- ❌ No monitoring dashboards  
- ❌ No retry mechanisms
- ❌ No health checks
- ❌ No continuous integration
- ✅ Just one-time execution
