/**
 * Token bucket rate limiter implementation for ethical web scraping
 * Allows burst capacity while maintaining average rate limits
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly domainBuckets: Map<string, { tokens: number; lastRefill: number }>;

  /**
   * Creates a new rate limiter
   * @param maxTokens Maximum tokens in the bucket (burst capacity)
   * @param refillRate Tokens added per second
   */
  constructor(maxTokens: number = 30, refillRate: number = 0.5) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.domainBuckets = new Map();
  }

  /**
   * Refills tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Refills tokens for a specific domain
   */
  private refillDomain(domain: string): void {
    const bucket = this.domainBuckets.get(domain);
    if (!bucket) {
      return;
    }

    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Waits for a token to become available
   * @param url Optional URL to apply domain-specific rate limiting
   */
  async waitForToken(url?: string): Promise<void> {
    let domain: string | null = null;
    
    if (url) {
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
        
        // Initialize domain bucket if not exists
        if (!this.domainBuckets.has(domain)) {
          this.domainBuckets.set(domain, {
            tokens: this.maxTokens,
            lastRefill: Date.now(),
          });
        }
      } catch {
        // Invalid URL, use global rate limiter only
      }
    }

    // Check domain-specific rate limit first
    if (domain) {
      this.refillDomain(domain);
      const bucket = this.domainBuckets.get(domain)!;
      
      while (bucket.tokens < 1) {
        const tokensNeeded = 1 - bucket.tokens;
        const waitTime = (tokensNeeded / this.refillRate) * 1000;
        await this.delay(Math.ceil(waitTime));
        this.refillDomain(domain);
      }
      
      bucket.tokens -= 1;
    }

    // Then check global rate limit
    this.refill();
    
    while (this.tokens < 1) {
      const tokensNeeded = 1 - this.tokens;
      const waitTime = (tokensNeeded / this.refillRate) * 1000;
      await this.delay(Math.ceil(waitTime));
      this.refill();
    }
    
    this.tokens -= 1;
  }

  /**
   * Adds a fixed delay
   * @param ms Milliseconds to wait
   */
  async addDelay(ms: number = 1000): Promise<void> {
    await this.delay(ms);
  }

  /**
   * Internal delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets current token count (for testing/monitoring)
   */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Gets domain-specific token count
   */
  getDomainTokenCount(domain: string): number {
    if (!this.domainBuckets.has(domain)) {
      return this.maxTokens;
    }
    
    this.refillDomain(domain);
    return this.domainBuckets.get(domain)!.tokens;
  }

  /**
   * Resets the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.domainBuckets.clear();
  }
}