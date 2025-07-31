# PVS Email Scraper - One-Time Scraper Documentation

## Project Overview

The PVS Email Scraper is a **one-time data collection tool** designed to extract contact information from 1,060 California K-12 school districts. This standalone Node.js application runs once, scrapes district websites, verifies emails, and exports a CSV file for CRM import. After execution, the project is complete - there are no recurring operations, monitoring requirements, or ongoing maintenance.

Document all progress in progress.md file and all technical debt in tech_debt.md and follow all prompts for development in the development_prompts.md file.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Standalone Node.js Application                │
│                     (Single Execution)                        │
└─────────────────┬───────────────────┬──────────────────────┘
                  │                   │
        ┌─────────▼────────┐ ┌───────▼──────────┐
        │   CDE Loader     │ │  CSV Exporter    │
        │  (Excel → Memory)│ │ (Firebase → CSV) │
        └─────────┬────────┘ └──────────────────┘
                  │
     ┌────────────▼───────────────┐
     │    Main Orchestrator       │
     │  ┌─────────────────────┐  │
     │  │ Playwright Scraper  │  │ ← p-limit (5 concurrent)
     │  ├─────────────────────┤  │
     │  │   PDF Processor     │  │ ← Tesseract.js OCR
     │  ├─────────────────────┤  │
     │  │  Email Generator    │  │ ← In-memory patterns
     │  ├─────────────────────┤  │
     │  │  SMTP Verifier      │  │ ← mailauth library
     │  └─────────────────────┘  │
     └────────────┬───────────────┘
                  │
            ┌─────▼─────┐
            │ Firebase  │ (Storage only - no monitoring)
            └───────────┘
```

## Technology Stack

- **Runtime**: Node.js 18+ (standalone script)
- **Language**: TypeScript (strict mode)
- **Web Scraping**: Playwright with stealth
- **PDF Processing**: pdf-parse + Tesseract.js OCR
- **Email Verification**: mailauth (full SMTP verification)
- **Concurrency**: p-limit (5 concurrent operations)
- **Storage**: Firebase (data storage only)
- **Output**: CSV file for CRM import

## Key Design Principles

### 1. **One-Time Execution**

- No scheduled jobs or recurring operations
- No monitoring dashboards or health checks
- No retry mechanisms between runs
- Single command runs entire process
- Clean exit after completion

### 2. **In-Memory Processing**

- Rate limiting using p-limit (not Cloud Tasks)
- Email pattern matching in memory
- Queue management without external services
- No cross-process communication needed

### 3. **Long-Running Capability**

- Runs as standalone script (not Cloud Function)
- No 540-second timeout limitations
- Can run for 12+ hours continuously
- Suitable for workstation or Cloud Run job

### 4. **Simple Output**

- Console progress logging
- CSV export at completion
- Basic statistics summary
- No web UI or dashboards

## Core Components

### 1. **CDE Data Loader**

```typescript
// One-time load of district data
async function loadCDEData(): Promise<District[]> {
  const workbook = XLSX.readFile('data/pubschls.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Parse districts - all get 'pending' status
  const districts = parseDistricts(sheet);
  
  // Single batch write to Firebase
  await writeBatchToFirebase(districts);
  
  console.log(`Loaded ${districts.length} districts`);
  return districts;
}
```

### 2. **Email Pattern Generator**

```typescript
// In-memory pattern matching (no persistence)
const patterns = [
  '{first}.{last}@{domain}',
  '{f}{last}@{domain}',
  '{first}_{last}@{domain}',
  '{last}{f}@{domain}'
];

function generateEmails(firstName: string, lastName: string, domain: string) {
  return patterns.map(pattern => 
    applyPattern(pattern, firstName, lastName, domain)
  );
}
```

### 3. **SMTP Email Verification**

```typescript
// Only mark 'verified' on SMTP 250 response
async function verifyEmail(email: string): Promise<EmailStatus> {
  const result = await mailauth.authenticate(email, {
    sender: 'verify@platinumvisual.com',
    validateMx: true,
    validateSMTP: true
  });
  
  // Strict verification - must get SMTP 250
  if (result.smtp?.code === 250) {
    return 'verified';
  } else if ([421, 450].includes(result.smtp?.code)) {
    return 'greylist_retry'; // Retry within same run
  }
  
  return 'invalid';
}
```

### 4. **Playwright Web Scraper**

```typescript
// Long-running scraper with p-limit concurrency
const limit = pLimit(5);

async function scrapeAllDistricts(districts: District[]) {
  for (const batch of chunks(districts, 50)) {
    await Promise.all(
      batch.map(district => 
        limit(() => scrapeDistrict(district))
      )
    );
    console.log(`Processed ${batch.length} districts`);
  }
}
```

### 5. **PDF Processor with OCR**

```typescript
// OCR fallback for scanned PDFs
async function processPDF(buffer: Buffer): Promise<Contact[]> {
  // Try text extraction first
  let text = '';
  try {
    const data = await pdfParse(buffer);
    text = data.text || '';
  } catch (e) {
    console.log('PDF parse failed');
  }
  
  // Use OCR if no text found
  if (!text || text.length < 100) {
    console.log('Running OCR on scanned PDF...');
    const pages = await pdfToImages(buffer);
    const ocrResults = await Promise.all(
      pages.map(page => Tesseract.recognize(page, 'eng'))
    );
    text = ocrResults.map(r => r.data.text).join('\n');
  }
  
  return extractContactsFromText(text);
}
```

## Execution Flow

```bash
# 1. Setup (one time)
npm install
cp .env.example .env
# Add Firebase credentials

# 2. Load CDE data (one time)
npm run load-districts

# 3. Run validation tests
npm run test

# 4. Execute main scrape (8-12 hours)
npm run scrape

# 5. Output
# Check output/contacts.csv
# Import to CRM
# Done!
```

## Resource Requirements

- **Memory**: 4-8GB RAM
- **CPU**: 2-4 cores recommended
- **Disk**: 10GB free space
- **Network**: Stable connection
- **Time**: 8-12 hours runtime

## Output Format

### CSV Structure

```csv
District,County,FirstName,LastName,Title,Email,EmailStatus,Department,Phone,Website,Confidence,ScrapedAt
"Los Angeles USD","Los Angeles","John","Smith","Facilities Director","john.smith@lausd.net","verified","Facilities","213-555-0100","lausd.net",95,"2024-01-20T10:30:00Z"
```

### Console Statistics

```
=== Scraping Statistics ===
Total Contacts: 5,234
Verified Emails: 4,123
Districts Covered: 1,052
Execution Time: 11h 23m
```

## Error Handling

- **Network failures**: Logged and skipped
- **CAPTCHA detection**: Falls back to department emails
- **PDF extraction failures**: Logged with district name
- **Memory issues**: Reduce concurrency in config
- **No automatic retries between runs**

## Deployment Options

### Option 1: Local Workstation

```bash
# Simple execution
npm run scrape
```

### Option 2: Cloud Run Job

```bash
# Deploy as one-time job
gcloud run jobs create pvs-scraper \
  --source . \
  --task-timeout=86400 \
  --memory=4Gi

# Execute once
gcloud run jobs execute pvs-scraper
```

## What This Is NOT

- ❌ **NOT a monitoring system** - No dashboards or alerts
- ❌ **NOT a recurring service** - Runs once and exits
- ❌ **NOT a web application** - Command-line only
- ❌ **NOT a Cloud Function** - Standalone script
- ❌ **NOT a queue service** - In-memory processing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Script stops unexpectedly | Check logs, restart (progress saved in Firebase) |
| High memory usage | Reduce concurrency from 5 to 3 |
| Many failed verifications | Check SMTP sender reputation |
| Missing contacts | Some districts have limited public info |
| OCR not working | Ensure Tesseract language data installed |

## Project Completion

The project is complete when:

1. Console shows "Done! Check output/contacts.csv"
2. CSV file contains district contacts
3. Data imported to CRM successfully
4. Script has exited cleanly
5. No further action required

## Important Notes

- **Single Use**: This tool is designed for one-time data collection
- **No Persistence**: Email patterns learned during run are not saved
- **Manual Review**: Some districts may need manual follow-up
- **Privacy**: No PII is logged or stored beyond the CSV output
- **Cleanup**: Can delete all code after successful run

---

*One-time data collection tool - Run once and done!*
