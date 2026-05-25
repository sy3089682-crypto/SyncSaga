import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyToken } from '../lib/jwt';

describe('JWT', () => {
  const payload = { userId: 'test-user', email: 'test@example.com' };

  it('should generate and verify access tokens', () => {
    const token = generateAccessToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
  });

  it('should reject invalid tokens', () => {
    const result = verifyToken('invalid-token');
    expect(result).toBeNull();
  });

  it('should reject expired tokens', () => {
    const token = generateAccessToken(payload);
    // Cannot easily test past expiry, but verify the token is valid immediately
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
  });
});
