import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { getEnv } from '@syncsaga/config';

const scrypt = promisify(scryptCallback);
const ROOM_PASSWORD_PREFIX = 'scrypt:v1';
const TOTP_SECRET_PREFIX = 'aes-256-gcm:v1';

function deriveEncryptionKey(): Buffer {
  const env = getEnv();
  const secret = env.TOTP_ENCRYPTION_KEY || env.JWT_SECRET;
  return createHash('sha256').update(secret).digest();
}

export async function hashRoomPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${ROOM_PASSWORD_PREFIX}:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

export async function verifyRoomPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, version, saltValue, hashValue] = encodedHash.split(':');
  if (`${algorithm}:${version}` !== ROOM_PASSWORD_PREFIX || !saltValue || !hashValue) return false;

  const salt = Buffer.from(saltValue, 'base64url');
  const expected = Buffer.from(hashValue, 'base64url');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${TOTP_SECRET_PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptTotpSecret(encodedSecret: string): string {
  if (!encodedSecret.startsWith(`${TOTP_SECRET_PREFIX}:`)) {
    // Backward-compatible plaintext fallback for existing enrollments. Re-save encrypted on next successful verify.
    return encodedSecret;
  }

  const [, , ivValue, tagValue, ciphertextValue] = encodedSecret.split(':');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Invalid encrypted TOTP secret');

  const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function isEncryptedTotpSecret(secret: string): boolean {
  return secret.startsWith(`${TOTP_SECRET_PREFIX}:`);
}
