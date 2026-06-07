import { describe, expect, it } from 'vitest';
import { decryptTotpSecret, encryptTotpSecret, hashRoomPassword, isEncryptedTotpSecret, verifyRoomPassword } from '../lib/crypto';

describe('security crypto helpers', () => {
  it('hashes and verifies room passwords without storing plaintext', async () => {
    const hash = await hashRoomPassword('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
    expect(await verifyRoomPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyRoomPassword('wrong password', hash)).toBe(false);
  });

  it('encrypts and decrypts TOTP secrets', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(isEncryptedTotpSecret(encrypted)).toBe(true);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });
});
