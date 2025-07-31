# PVS Email Scraper

A one-time data collection tool for extracting contact information from California K-12 school districts.

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Set up environment
cp .env.example .env
# Edit .env with your Firebase credentials

# 4. Download CDE data
# Place pubschls.xlsx in the data/ directory

# 5. Load districts
npm run load-districts

# 6. Run scraper
npm run scrape
```

## Features

- 🔍 **Smart Contact Extraction**: Scrapes district websites for facilities and operations contacts
- 📧 **Email Verification**: SMTP validation for all discovered emails
- 🤖 **Pattern Recognition**: Learns email patterns from known contacts
- 📄 **PDF Processing**: Extracts contacts from PDFs with OCR fallback
- 🛡️ **Anti-Detection**: Uses Playwright with stealth plugin
- 📊 **CSV Export**: Ready for CRM import

## Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- CDE Excel file (pubschls.xlsx)
- 4-8GB RAM
- Stable internet connection

## Configuration

Create a `.env` file with your Firebase service account credentials:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
# ... (see .env.example for all fields)
```

## Usage

### Load District Data
```bash
npm run load-districts
```
Loads ~1,060 districts from CDE Excel file into Firebase.

### Run Scraper
```bash
npm run scrape
```
Starts the scraping process. Expect 8-12 hours runtime.

### Test Installation
```bash
npm test
```
Validates configuration and runs basic tests.

## Output

The scraper generates:
- `output/contacts.csv` - Main contact list
- `output/summary.txt` - Execution statistics
- `output/failed_districts.csv` - Districts that failed processing (if any)

### CSV Format
```csv
District,County,FirstName,LastName,Title,Email,EmailStatus,Department,Phone,Website,Confidence,ScrapedAt
```

## Architecture

```
src/
├── loaders/        # CDE data loader
├── scrapers/       # Playwright web scraper
├── processors/     # Email generator, verifier, PDF processor
├── utils/          # Firebase, CSV export
├── types/          # TypeScript definitions
└── orchestrator.ts # Main coordination logic
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run `npm run typecheck` to identify issues |
| Missing Firebase config | Check .env file has all required fields |
| High memory usage | Reduce MAX_CONCURRENT_SCRAPERS in .env |
| CAPTCHA blocks | Script falls back to department emails automatically |

## Development

```bash
# Watch mode
npm run dev

# Type checking
npm run typecheck

# Build
npm run build

# Clean outputs
npm run clean
```

## Important Notes

- **One-time use**: Run once to collect all data
- **Long runtime**: Expect 8-12 hours for full scrape
- **Privacy**: No PII is logged beyond CSV output
- **Rate limiting**: Built-in concurrency control (5 concurrent scrapers)

## License

Private project - not for distribution