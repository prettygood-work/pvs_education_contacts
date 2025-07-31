# PVS Email Scraper - Operations Runbook

## Quick Reference

**Purpose**: One-time scrape of 937 California K-12 school district websites  
**Runtime**: 8-12 hours  
**Output**: CSV file with verified contact information  

## Starting a Scrape Run

### Pre-Flight Checks
```bash
# 1. Verify environment
node --version  # Should be 18+
npm test        # All tests should pass

# 2. Check Firebase connection
npm run migrate-districts -- --dry-run

# 3. Verify disk space
df -h  # Need 10GB+ free
```

### Start Commands

**Production Run**:
```bash
# Full scrape
npm run scrape

# With custom concurrency
MAX_CONCURRENT_SCRAPERS=3 npm run scrape

# Background with logging
nohup npm run scrape > logs/scrape_$(date +%Y%m%d_%H%M%S).log 2>&1 &
```

**Docker Run**:
```bash
# Standard
docker-compose up

# Detached
docker-compose up -d
```

## Monitoring

### Real-Time Progress

1. **Log Monitoring**:
   ```bash
   # Follow main log
   tail -f logs/app.log | grep -E "(Progress:|ERROR|WARN)"
   
   # Watch for completions
   tail -f logs/app.log | grep "District scraping completed"
   
   # Count processed
   grep -c "District scraping completed" logs/app.log
   ```

2. **Firestore Dashboard**:
   - URL: https://console.firebase.google.com/project/YOUR_PROJECT/firestore
   - Collection: `scrape_progress` → Latest document
   - Shows: pending, processing, completed, failed counts

3. **Key Metrics**:
   ```bash
   # Average time per district
   grep "District scraping completed" logs/app.log | \
     awk -F'duration":' '{print $2}' | \
     awk -F',' '{sum+=$1; count++} END {print sum/count/1000 " seconds"}'
   
   # Success rate
   grep -E "(completed|failed)" logs/app.log | \
     awk '/completed/{c++} /failed/{f++} END {print "Success rate: " c/(c+f)*100 "%"}'
   ```

### Health Indicators

**Healthy**:
- Steady progress (5-10 districts/minute)
- Memory usage stable
- No repeated errors for same district
- Log entries showing "District scraping completed"

**Unhealthy**:
- Memory usage growing continuously
- Same district failing repeatedly
- No progress for 30+ minutes
- Excessive "Circuit breaker open" messages

## Common Operations

### Pause and Resume

**Graceful Pause**:
```bash
# Find process
ps aux | grep "npm run scrape"

# Send interrupt signal
kill -SIGINT <PID>

# Wait for "Cleaning up resources..." in logs
```

**Resume**:
```bash
# Simply restart - will skip completed districts
npm run scrape
```

### Check Specific District

```bash
# In Firestore Console
districts/{districtId}

# Via logs
grep "0161119000000" logs/app.log

# Get district status
firebase firestore:get districts/0161119000000
```

### Export Partial Results

```bash
# If scraper is still running
cp output/contacts.csv output/contacts_partial_$(date +%Y%m%d).csv

# Get stats
echo "Total contacts: $(wc -l < output/contacts.csv)"
echo "Verified emails: $(grep -c "verified" output/contacts.csv)"
```

## Troubleshooting

### Scraper Won't Start

1. **Check environment**:
   ```bash
   # Verify .env exists
   ls -la .env
   
   # Test Firebase connection
   node -e "require('./dist/utils/firebase').initializeFirebase()"
   ```

2. **Clear locks**:
   ```bash
   # Remove stale lock files
   rm -f .cache/*.lock
   ```

### High Memory Usage

```bash
# Check current usage
docker stats pvs-scraper

# Reduce concurrency
docker-compose down
# Edit .env: MAX_CONCURRENT_SCRAPERS=2
docker-compose up
```

### Specific District Failing

```bash
# Get error details
grep -A5 -B5 "districtId.*0161119000000.*ERROR" logs/app.log

# Manually check district website
curl -I https://district-website.com

# Skip district (mark as failed)
firebase firestore:update districts/0161119000000 status=failed
```

### No Progress

1. **Check rate limiting**:
   ```bash
   grep "Rate limit" logs/app.log | tail -20
   ```

2. **Check network**:
   ```bash
   # Test connectivity
   curl -I https://www.google.com
   
   # Check DNS
   nslookup lausd.net
   ```

3. **Restart with debug**:
   ```bash
   LOG_LEVEL=debug npm run scrape
   ```

## Error Recovery

### Catastrophic Failure

1. **Save current state**:
   ```bash
   # Backup Firestore
   firebase firestore:export backup/$(date +%Y%m%d)
   
   # Save logs
   tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/
   ```

2. **Analyze failure**:
   ```bash
   # Get last successful district
   grep "District scraping completed" logs/app.log | tail -1
   
   # Find error
   grep -E "FATAL|ERROR" logs/app.log | tail -50
   ```

3. **Resume options**:
   - Fix issue and restart (auto-resumes)
   - Mark problem districts as failed and continue
   - Export partial results and investigate

### Corrupt Output

```bash
# Validate CSV
python3 -c "import csv; list(csv.reader(open('output/contacts.csv')))"

# Regenerate from Firestore
node -e "require('./dist/utils/csvExporter').exportFromFirestore()"
```

## Performance Tuning

### Optimize for Speed
```env
MAX_CONCURRENT_SCRAPERS=8
RATE_LIMIT_REQUESTS_PER_MINUTE=60
HEADLESS_BROWSER=true
```

### Optimize for Stability
```env
MAX_CONCURRENT_SCRAPERS=3
RATE_LIMIT_REQUESTS_PER_MINUTE=20
RETRY_MAX_ATTEMPTS=5
```

### Optimize for Low Memory
```env
MAX_CONCURRENT_SCRAPERS=2
BATCH_SIZE=25
LOG_LEVEL=warn
```

## Maintenance Tasks

### Daily (During Run)
- Check progress every 2-3 hours
- Monitor disk space
- Verify no memory leaks

### Post-Run
- Backup output CSV
- Archive logs
- Generate summary report
- Clear temporary files

### Cleanup Commands
```bash
# Remove old logs
find logs -name "*.log" -mtime +30 -delete

# Clear temp files
rm -rf .temp/* .cache/*

# Compress logs
tar -czf logs_$(date +%Y%m%d).tar.gz logs/*.log
```

## Emergency Contacts

- **Firebase Issues**: Check Firebase Status at status.firebase.google.com
- **Network Issues**: Verify with ISP/Cloud provider
- **Application Issues**: Check GitHub issues and logs

## Key Files and Locations

- **Logs**: `logs/app.log`, `logs/error.log`
- **Output**: `output/contacts.csv`
- **Config**: `.env`, `src/config/index.ts`
- **Progress**: Firebase Console → `scrape_progress` collection
- **Districts**: Firebase Console → `districts` collection

## Success Criteria

The scrape is considered successful when:
1. All 937 districts have been processed (completed or failed)
2. Output CSV contains at least 3,000 contacts
3. At least 60% of emails are verified
4. No critical errors in final hour of execution
5. Summary report generated successfully