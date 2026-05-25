import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '../services/redis.service';
import { getEnv } from '@syncsaga/config';

const env = getEnv();
const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface RefreshJwtPayload extends JwtPayload {
  refreshId: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function generateRefreshToken(payload: JwtPayload): { token: string; id: string } {
  const id = uuidv4();
  const token = jwt.sign({ ...payload, refreshId: id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { token, id };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshJwtPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as RefreshJwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function storeRefreshToken(userId: string, refreshId: string): Promise<void> {
  await redisService.getClient().setEx(`refresh:${userId}:${refreshId}`, 7 * 24 * 60 * 60, 'valid');
}

export async function rotateRefreshToken(userId: string, oldRefreshId: string): Promise<{ token: string; id: string } | null> {
  const key = `refresh:${userId}:${oldRefreshId}`;
  const exists = await redisService.getClient().get(key);
  if (!exists) return null;

  await redisService.getClient().del(key);
  const newToken = generateRefreshToken({ userId, email: '' });
  await storeRefreshToken(userId, newToken.id);
  return newToken;
}

export async function revokeRefreshToken(userId: string, refreshId: string): Promise<void> {
  await redisService.getClient().del(`refresh:${userId}:${refreshId}`);
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  const keys = await redisService.getClient().keys(`refresh:${userId}:*`);
  if (keys.length > 0) await redisService.getClient().del(keys);
}
