import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Auth Middleware Tests
 *
 * Tests token verification, profile lookup, role-based access,
 * and error responses for invalid/missing tokens.
 */

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { host_id: 'user-1', co_hosts: ['user-2'] },
            error: null,
          }),
        }),
      }),
    }),
  },
  verifySupabaseToken: vi.fn(),
  getUserProfile: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject requests without Authorization header', async () => {
    const { authMiddleware } = await import('../middleware/auth');
    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with non-Bearer tokens', async () => {
    const { authMiddleware } = await import('../middleware/auth');
    const req = {
      headers: { authorization: 'Basic abc123' },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid tokens', async () => {
    const { verifySupabaseToken, getUserProfile } = await import('../lib/supabase');
    vi.mocked(verifySupabaseToken).mockResolvedValueOnce(null);

    const { authMiddleware } = await import('../middleware/auth');
    const req = {
      headers: { authorization: 'Bearer invalid-token' },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it('should accept valid tokens and attach user to request', async () => {
    const { verifySupabaseToken, getUserProfile } = await import('../lib/supabase');
    vi.mocked(verifySupabaseToken).mockResolvedValueOnce('valid-user-id');
    vi.mocked(getUserProfile).mockResolvedValueOnce({
      id: 'valid-user-id',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
    });

    const { authMiddleware } = await import('../middleware/auth');
    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.userId).toBe('valid-user-id');
    expect(req.user).toEqual({
      id: 'valid-user-id',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
    });
    expect(next).toHaveBeenCalled();
  });

  it('should reject when user profile is not found', async () => {
    const { verifySupabaseToken, getUserProfile } = await import('../lib/supabase');
    vi.mocked(verifySupabaseToken).mockResolvedValueOnce('valid-user-id');
    vi.mocked(getUserProfile).mockResolvedValueOnce(null);

    const { authMiddleware } = await import('../middleware/auth');
    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Optional Auth Middleware', () => {
  it('should continue without user when no token', async () => {
    const { optionalAuth } = await import('../middleware/auth');
    const req = { headers: {} } as any;
    const res = {} as any;
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(req.userId).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should attach user when valid token present', async () => {
    const { verifySupabaseToken, getUserProfile } = await import('../lib/supabase');
    vi.mocked(verifySupabaseToken).mockResolvedValueOnce('valid-user-id');
    vi.mocked(getUserProfile).mockResolvedValueOnce({
      id: 'valid-user-id',
      username: 'testuser',
      display_name: null,
      avatar_url: null,
    });

    const { optionalAuth } = await import('../middleware/auth');
    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(req.userId).toBe('valid-user-id');
    expect(next).toHaveBeenCalled();
  });
});

describe('Circuit Breaker', () => {
  it('should start in CLOSED state', async () => {
    const { supabaseCircuitBreaker } = await import('../lib/circuit-breaker');
    const stats = supabaseCircuitBreaker.getStats();
    expect(stats.state).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3, resetTimeout: 1000 });

    // Cause 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    const stats = cb.getStats();
    expect(stats.state).toBe('OPEN');
    expect(stats.failures).toBe(3);
  });

  it('should reject calls when open', async () => {
    const { CircuitBreaker, CircuitBreakerOpenError } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test2', failureThreshold: 2, resetTimeout: 60000 });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    // Should reject immediately
    await expect(cb.execute(async () => 'success')).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('should close after successful half-open test', async () => {
    const { CircuitBreaker } = await import('../lib/circuit-breaker');
    const cb = new CircuitBreaker({ name: 'test3', failureThreshold: 2, resetTimeout: 100 });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch {}
    }

    expect(cb.isOpen()).toBe(true);

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should allow call (half-open) and close on success
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(cb.getStats().state).toBe('CLOSED');
  });
});
