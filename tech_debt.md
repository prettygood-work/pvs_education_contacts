# Technical Debt Log

## Current Issues

### Security Vulnerability
- **Issue**: npm audit reports 1 high severity vulnerability
- **Impact**: Potential security risk
- **Action**: Run `npm audit fix` or investigate specific vulnerability
- **Priority**: High

### Type Definitions
- **Issue**: Some libraries may lack complete TypeScript definitions
- **Impact**: Potential type safety issues
- **Action**: Monitor for type errors during development
- **Priority**: Medium

## Future Improvements

### Performance Optimizations
- Consider implementing caching for repeated domain lookups
- Optimize PDF processing for large files
- Implement smart retry logic for transient failures

### Code Quality
- Add comprehensive error handling across all modules
- Implement structured logging with log levels
- Add input validation for all external data

### Testing
- Need unit tests for email pattern generation
- Integration tests for SMTP verification
- End-to-end tests for full scraping pipeline

### Documentation
- Add JSDoc comments to all public functions
- Create API documentation for main modules
- Add troubleshooting guide for common issues

## Technical Decisions

### Why p-limit over Cloud Tasks
- Simpler implementation for one-time execution
- No external service dependencies
- Better suited for long-running local process

### Why Firebase for storage
- Simple NoSQL structure perfect for district data
- Easy to implement progress tracking
- No schema migrations needed

### Why Playwright over Puppeteer
- Better stealth capabilities with plugins
- More reliable for modern web apps
- Built-in auto-waiting features