import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Circuit Breaker Tests
 *
 * Tests all three states (CLOSED, OPEN, HALF_OPEN) and
 * transitions between them.
 */

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('CircuitBreaker - State Transitions', () => {
  it('should start in CLOSED state', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test' });
    expect(cb.getStats().state).toBe('CLOSED');
    expect(cb.isOpen()).toBe(false);
  });

  it('should transition to OPEN after threshold failures', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3, resetTimeout: 60000 });

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(cb.getStats().state).toBe('OPEN');
    expect(cb.isOpen()).toBe(true);
    expect(cb.getStats().failures).toBe(3);
  });

  it('should not open if failures are below threshold', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 5, resetTimeout: 60000 });

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(cb.getStats().state).toBe('CLOSED');
  });

  it('should reset failure count on success', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3, resetTimeout: 60000 });

    // 2 failures
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    // 1 success resets count
    await cb.execute(async () => 'success');

    expect(cb.getStats().state).toBe('CLOSED');
    expect(cb.getStats().failures).toBe(0);

    // 2 more failures should not open (need 3 consecutive)
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(cb.getStats().state).toBe('CLOSED');
  });
});

describe('CircuitBreaker - Open State', () => {
  it('should reject calls immediately when open', async () => {
    const { CircuitBreaker, CircuitBreakerOpenError } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, resetTimeout: 60000 });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    // Should reject without calling the function
    const mockFn = vi.fn().mockResolvedValue('success');
    await expect(cb.execute(mockFn)).rejects.toThrow(CircuitBreakerOpenError);
    expect(mockFn).not.toHaveBeenCalled();
    expect(cb.getStats().rejectedCalls).toBe(1);
  });
});

describe('CircuitBreaker - Half-Open Recovery', () => {
  it('should transition to HALF_OPEN after reset timeout', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, resetTimeout: 100 });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(cb.isOpen()).toBe(true);

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should allow one test call
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(cb.getStats().state).toBe('CLOSED');
  });

  it('should re-open if half-open test fails', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, resetTimeout: 100 });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Half-open test fails
    try {
      await cb.execute(async () => { throw new Error('still failing'); });
    } catch {}

    expect(cb.getStats().state).toBe('OPEN');
  });
});

describe('CircuitBreaker - Manual Reset', () => {
  it('should reset to CLOSED state', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, resetTimeout: 60000 });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(cb.isOpen()).toBe(true);

    cb.reset();

    expect(cb.getStats().state).toBe('CLOSED');
    expect(cb.getStats().failures).toBe(0);
  });
});

describe('CircuitBreaker - Stats Tracking', () => {
  it('should track total calls and successes', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 10, resetTimeout: 60000 });

    await cb.execute(async () => 'success-1');
    await cb.execute(async () => 'success-2');
    try {
      await cb.execute(async () => { throw new Error('fail'); });
    } catch {}

    const stats = cb.getStats();
    expect(stats.totalCalls).toBe(3);
    expect(stats.successes).toBe(2);
    expect(stats.failures).toBe(1);
  });
});
