# PVS Email Scraper - Deployment Guide

## Overview

This guide covers deploying the PVS Email Scraper in various environments. The scraper is designed for one-time execution and can run for 8-12 hours to process all 937 California K-12 school districts.

## Prerequisites

- Node.js 18+ (for local deployment)
- Docker (for containerized deployment)
- Firebase project with Firestore enabled
- Service account credentials for Firebase
- 4-8GB RAM available
- Stable internet connection

## Environment Setup

### 1. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Create a service account:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

4. Extract credentials from the JSON file for `.env`:
   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   ```

### 2. Environment Variables

Create a `.env.production` file:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com

# SMTP Configuration
SMTP_VERIFY_SENDER=verify@yourcompany.com

# Scraper Configuration
MAX_CONCURRENT_SCRAPERS=5
HEADLESS_BROWSER=true
NODE_ENV=production
LOG_LEVEL=info
```

## Deployment Options

### Option 1: Local Deployment

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Load district data
npm run migrate-districts

# Run the scraper
npm run scrape
```

### Option 2: Docker Deployment

```bash
# Build the image
docker build -t pvs-scraper .

# Run with environment file
docker run --env-file .env.production \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/logs:/app/logs \
  pvs-scraper
```

### Option 3: Docker Compose

```bash
# Start the scraper
docker-compose up

# Run migration separately (if needed)
docker-compose --profile migrate up scraper-migrate
```

### Option 4: Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT/pvs-scraper

# Deploy to Cloud Run
gcloud run deploy pvs-scraper \
  --image gcr.io/YOUR_PROJECT/pvs-scraper \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 1 \
  --set-env-vars "NODE_ENV=production,LOG_LEVEL=info" \
  --set-secrets "FIREBASE_PRIVATE_KEY=firebase-key:latest"
```

### Option 5: VM Deployment (GCP/AWS/Azure)

1. **Provision VM**:
   - 4 vCPUs, 8GB RAM
   - Ubuntu 22.04 LTS
   - 50GB SSD

2. **Setup Environment**:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Deploy Application**:
   ```bash
   # Clone repository
   git clone https://github.com/your-org/pvs-scraper.git
   cd pvs-scraper
   
   # Copy environment file
   scp .env.production user@vm-ip:~/pvs-scraper/
   
   # Run with Docker
   docker-compose up -d
   ```

## Pre-Deployment Checklist

- [ ] Firebase project created and Firestore enabled
- [ ] Service account credentials obtained
- [ ] Environment variables configured
- [ ] District data file (`data/districts-full.json`) populated with all 937 districts
- [ ] Output directory created and writable
- [ ] Sufficient disk space (10GB+ recommended)
- [ ] Network connectivity verified

## Running the Scraper

### Initial Setup (One-Time)

1. **Migrate Districts to Firestore**:
   ```bash
   npm run migrate-districts
   ```
   This loads all district data into Firestore.

2. **Verify Setup**:
   ```bash
   npm test
   ```

### Starting the Scrape

```bash
# Local
npm run scrape

# Docker
docker run --env-file .env.production pvs-scraper

# Background execution
nohup npm run scrape > scrape.log 2>&1 &
```

### Monitoring Progress

1. **Check Logs**:
   ```bash
   # Local
   tail -f logs/app.log
   
   # Docker
   docker logs -f pvs-scraper
   ```

2. **Firestore Console**:
   - Navigate to Firebase Console → Firestore
   - Check `scrape_progress` collection for real-time stats
   - View `district_logs` for individual district results

3. **Progress Indicators**:
   - Log messages show "Progress: X/937 completed, Y failed"
   - Each district logs start/completion with contact count
   - Errors are logged with district name and reason

## Resume Capability

If the scraper stops unexpectedly:

1. **Automatic Resume**:
   - Simply restart the scraper
   - It will check Firestore for processed districts
   - Only unprocessed districts will be scraped

2. **Manual Resume**:
   ```bash
   # Check last run status
   firebase firestore:read scrape_progress --limit 1
   
   # Restart scraper
   npm run scrape
   ```

## Output

### CSV File Location
- Local: `output/contacts.csv`
- Docker: Mounted volume specified in run command
- Cloud Run: Requires external storage (GCS bucket)

### CSV Format
```csv
District,County,FirstName,LastName,Title,Email,EmailStatus,Department,Phone,Website,Confidence,ScrapedAt
```

### Summary Files
- `output/summary.txt`: Execution statistics
- `output/failed_districts.csv`: Districts that failed processing

## Troubleshooting

### Common Issues

1. **Out of Memory**:
   - Reduce `MAX_CONCURRENT_SCRAPERS` to 3
   - Increase VM/container memory allocation

2. **Network Timeouts**:
   - Check internet connectivity
   - Verify firewall rules allow outbound HTTPS
   - Increase timeout values in config

3. **Firebase Connection Issues**:
   - Verify service account credentials
   - Check Firebase project ID matches
   - Ensure Firestore is enabled

4. **No Contacts Found**:
   - Normal for some districts
   - Check logs for specific errors
   - Verify email verification sender domain

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run scrape

# Run single district test
SINGLE_DISTRICT_TEST=0161119000000 npm run scrape
```

## Post-Deployment

1. **Verify Output**:
   ```bash
   # Check CSV was created
   ls -la output/contacts.csv
   
   # Count contacts
   wc -l output/contacts.csv
   ```

2. **Backup Data**:
   ```bash
   # Backup Firestore
   gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d)
   
   # Backup CSV
   cp output/contacts.csv output/contacts_$(date +%Y%m%d).csv
   ```

3. **Clean Up**:
   ```bash
   # Remove logs older than 7 days
   find logs -name "*.log" -mtime +7 -delete
   
   # Clear Firestore test data (if needed)
   firebase firestore:delete districts --recursive
   ```

## Security Considerations

- Never commit `.env` files to version control
- Rotate Firebase service account keys periodically
- Use least-privilege service account permissions
- Monitor for unusual activity in Firebase Console
- Ensure output CSV is stored securely (contains contact info)

## Support

For issues or questions:
1. Check logs for error messages
2. Review troubleshooting section
3. Consult technical documentation in README.md
4. Contact development team with error logs and environment details