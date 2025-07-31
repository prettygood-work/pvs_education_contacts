import logger from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<new (...args: any[]) => Error>;
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [],
  onRetry: () => {},
};

/**
 * Implements retry logic with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      // Check if we've exhausted retries
      if (attempt === opts.maxRetries) {
        logger.error('Max retries exceeded', {
          error: lastError.message,
          attempts: attempt + 1,
          operation: fn.name || 'anonymous',
        });
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );

      logger.warn(`Retrying after error (attempt ${attempt + 1}/${opts.maxRetries})`, {
        error: lastError.message,
        delay,
        nextAttempt: attempt + 1,
      });

      // Call retry callback
      opts.onRetry(lastError, attempt + 1);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Checks if an error is retryable
 */
function isRetryableError(
  error: unknown,
  retryableErrors: Array<new (...args: any[]) => Error>
): boolean {
  // Always retry on network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    ) {
      return true;
    }
  }

  // Check against specific error types
  if (retryableErrors.length > 0 && error instanceof Error) {
    return retryableErrors.some(ErrorType => error instanceof ErrorType);
  }

  // Default: retry on all errors
  return true;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Decorator for adding retry logic to class methods
 */
export function Retryable(options?: RetryOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Common retry configurations
 */
export const RetryConfigs = {
  // For network requests
  network: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
  },

  // For database operations
  database: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffFactor: 1.5,
  },

  // For external API calls
  api: {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 20000,
    backoffFactor: 2,
  },

  // For file operations
  file: {
    maxRetries: 2,
    initialDelay: 100,
    maxDelay: 1000,
    backoffFactor: 2,
  },
};

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.threshold,
      });
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}