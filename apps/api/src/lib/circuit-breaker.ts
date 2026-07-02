import { logger } from '../lib/logger';

/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by stopping calls to a failing service
 * after a threshold of failures, then periodically testing if the
 * service has recovered.
 *
 * States:
 * - CLOSED: Normal operation, calls go through
 * - OPEN: Service is failing, calls are rejected immediately
 * - HALF_OPEN: Testing if service has recovered (limited calls allowed)
 *
 * Configuration:
 * - failureThreshold: Number of consecutive failures before opening (default: 5)
 * - resetTimeout: Time to wait before trying again (default: 60s)
 * - monitoringPeriod: Window for counting failures (default: 60s)
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  name?: string;
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  rejectedCalls: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private rejectedCalls = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60_000;
    this.monitoringPeriod = options.monitoringPeriod ?? 60_000;
    this.name = options.name ?? 'default';
  }

  /**
   * Execute a function with circuit breaker protection.
   * If the circuit is open, throws immediately without calling the function.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        this.rejectedCalls++;
        logger.warn(
          { circuit: this.name, state: this.state, rejectedCalls: this.rejectedCalls },
          'Circuit breaker open — rejecting call'
        );
        throw new CircuitBreakerOpenError(`Circuit breaker "${this.name}" is open`);
      }

      // Transition to half-open — allow one test call
      this.state = 'HALF_OPEN';
      logger.info({ circuit: this.name }, 'Circuit breaker transitioning to HALF_OPEN');
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
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Service has recovered — close the circuit
      this.state = 'CLOSED';
      this.failureCount = 0;
      logger.info({ circuit: this.name }, 'Circuit breaker CLOSED — service recovered');
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Service is still failing — re-open the circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logger.warn({ circuit: this.name }, 'Circuit breaker re-OPENED from half-open');
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Threshold reached — open the circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      logger.error(
        { circuit: this.name, failures: this.failureCount, threshold: this.failureThreshold },
        'Circuit breaker OPENED — failure threshold reached'
      );
    }
  }

  /**
   * Get current circuit breaker state and stats.
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalCalls: this.totalCalls,
      rejectedCalls: this.rejectedCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  /**
   * Force-reset the circuit breaker to closed state.
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
    logger.info({ circuit: this.name }, 'Circuit breaker manually reset');
  }

  /**
   * Check if the circuit is currently open.
   */
  isOpen(): boolean {
    return this.state === 'OPEN';
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ============================================================
// Pre-configured circuit breakers for external services
// ============================================================

export const supabaseCircuitBreaker = new CircuitBreaker({
  name: 'supabase',
  failureThreshold: 10,
  resetTimeout: 30_000,
  monitoringPeriod: 60_000,
});

export const redisCircuitBreaker = new CircuitBreaker({
  name: 'redis',
  failureThreshold: 5,
  resetTimeout: 10_000,
  monitoringPeriod: 30_000,
});

export const aiProviderCircuitBreaker = new CircuitBreaker({
  name: 'ai-provider',
  failureThreshold: 3,
  resetTimeout: 60_000,
  monitoringPeriod: 60_000,
});

/**
 * Execute a Supabase database call with circuit breaker protection.
 */
export async function withSupabaseCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return supabaseCircuitBreaker.execute(fn);
}

/**
 * Execute a Redis operation with circuit breaker protection.
 */
export async function withRedisCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return redisCircuitBreaker.execute(fn);
}

/**
 * Execute an AI provider call with circuit breaker protection.
 */
export async function withAiCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  return aiProviderCircuitBreaker.execute(fn);
}
