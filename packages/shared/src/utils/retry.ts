// ============================================
// VITAO JARVIS CRM - Retry & Circuit Breaker
// Production Robustness Utilities
// ============================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterPercent: number;
  retryableErrors?: string[];
}

/**
 * Default retry configuration
 * Exponential backoff: 1s, 2s, 4s, 8s, 16s
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterPercent: 20,
  retryableErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
    '429', // Rate limited
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
  ],
};

/**
 * Calculates delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±jitterPercent%)
  const jitterRange = cappedDelay * (config.jitterPercent / 100);
  const jitter = Math.random() * jitterRange * 2 - jitterRange;

  return Math.floor(cappedDelay + jitter);
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(
  error: Error | { code?: string; status?: number },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  const retryable = config.retryableErrors || [];

  // Check error code
  if ('code' in error && error.code) {
    if (retryable.includes(error.code)) return true;
  }

  // Check HTTP status
  if ('status' in error && error.status) {
    if (retryable.includes(String(error.status))) return true;
  }

  // Check error message for common patterns
  const message = error instanceof Error ? error.message : String(error);
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /ECONNR/i,
    /ETIMEDOUT/i,
    /rate limit/i,
    /too many requests/i,
    /service unavailable/i,
  ];

  return retryablePatterns.some((pattern) => pattern.test(message));
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry result type
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

/**
 * Executes a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalDelayMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < fullConfig.maxRetries && isRetryableError(lastError, fullConfig)) {
        const delayMs = calculateRetryDelay(attempt, fullConfig);
        totalDelayMs += delayMs;
        await sleep(delayMs);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxRetries + 1,
    totalDelayMs,
  };
}

// ============================================
// CIRCUIT BREAKER
// ============================================

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  openTimeoutMs: 30000, // 30 seconds
  halfOpenMaxAttempts: 3,
};

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  openedAt: Date | null;
}

/**
 * In-memory circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private openedAt: Date | null = null;
  private halfOpenAttempts = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG
  ) {}

  /**
   * Gets current circuit state
   */
  getState(): CircuitBreakerState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.openedAt) {
      const elapsed = Date.now() - this.openedAt.getTime();
      if (elapsed >= this.config.openTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      }
    }

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
    };
  }

  /**
   * Checks if circuit allows execution
   */
  isAllowed(): boolean {
    const currentState = this.getState();

    switch (currentState.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        return false;
      case CircuitState.HALF_OPEN:
        return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
    }
  }

  /**
   * Records a successful execution
   */
  recordSuccess(): void {
    this.successCount++;
    this.lastSuccessAt = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        // Reset to closed
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.openedAt = null;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureAt = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.state = CircuitState.OPEN;
      this.openedAt = new Date();
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.openedAt = new Date();
        this.successCount = 0;
      }
    }
  }

  /**
   * Executes a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isAllowed()) {
      throw new CircuitOpenError(
        `Circuit breaker '${this.name}' is OPEN`,
        this.getState()
      );
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Manually resets the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = null;
    this.halfOpenAttempts = 0;
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    message: string,
    public readonly circuitState: CircuitBreakerState
  ) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

// ============================================
// COMBINED RETRY + CIRCUIT BREAKER
// ============================================

/**
 * Registry of circuit breakers
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Gets or creates a circuit breaker for a service
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: CircuitBreakerConfig
): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(
      serviceName,
      new CircuitBreaker(serviceName, config || DEFAULT_CIRCUIT_BREAKER_CONFIG)
    );
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Executes with both retry and circuit breaker
 */
export async function withRetryAndCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options: {
    retry?: Partial<RetryConfig>;
    circuitBreaker?: CircuitBreakerConfig;
  } = {}
): Promise<RetryResult<T>> {
  const breaker = getCircuitBreaker(serviceName, options.circuitBreaker);

  // Check circuit state first
  if (!breaker.isAllowed()) {
    return {
      success: false,
      error: new CircuitOpenError(
        `Circuit breaker '${serviceName}' is OPEN`,
        breaker.getState()
      ),
      attempts: 0,
      totalDelayMs: 0,
    };
  }

  // Execute with retry
  const result = await withRetry(async () => {
    return await breaker.execute(fn);
  }, options.retry);

  return result;
}

/**
 * Resets all circuit breakers (for testing)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach((breaker) => breaker.reset());
  circuitBreakers.clear();
}
