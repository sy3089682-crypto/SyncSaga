import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { generateAccessToken, generateRefreshToken, storeRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllRefreshTokens } from '../lib/jwt';
import { verifyToken } from '../lib/jwt';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { redisService } from '../services/redis.service';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric'),
});

const passwordResetSchema = z.object({
  email: z.string().email(),
});

const passwordUpdateSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

function requireAuth(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return null;
  }
  return decoded.userId;
}

function createAuthResponse(userId: string, email: string, user: any, req: Request, res: Response) {
  const accessToken = generateAccessToken({ userId, email });
  const refreshToken = generateRefreshToken({ userId, email });

  storeRefreshToken(userId, refreshToken.id);

  res.cookie('refreshToken', refreshToken.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  return { token: accessToken, refreshToken: refreshToken.token, user };
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        username: data.username,
        display_name: data.username,
      });
    }

    const result = createAuthResponse(authData.user!.id, data.email, authData.user, req, res);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password: rawPassword } = req.body;
    const data = loginSchema.parse({ email, password: rawPassword });

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { data: twoFactor } = await supabase
      .from('profiles')
      .select('totp_enabled')
      .eq('id', authData.user.id)
      .single();

    if (twoFactor?.totp_enabled) {
      const { totpToken } = req.body;
      if (!totpToken) {
        return res.json({ requireTotp: true, tempToken: authData.access_token });
      }
    }

    const result = createAuthResponse(
      authData.user.id,
      authData.user.email!,
      authData.user,
      req,
      res
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  const { code } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: code,
    });

    if (error) throw error;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'user',
        display_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
      });
    }

    const result = createAuthResponse(data.user.id, data.user.email!, data.user, req, res);
    res.json(result);
  } catch (error: any) {
    logger.error('Google auth error:', error);
    res.status(400).json({ error: error.message || 'Authentication failed' });
  }
});

router.post('/github', async (req: Request, res: Response) => {
  const { code } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'github',
      token: code,
    });
    if (error) throw error;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'user',
        display_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
      });
    }

    const result = createAuthResponse(data.user.id, data.user.email!, data.user, req, res);
    res.json(result);
  } catch (error: any) {
    logger.error('GitHub auth error:', error);
    res.status(400).json({ error: error.message || 'Authentication failed' });
  }
});

router.post('/discord', async (req: Request, res: Response) => {
  const { code } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'discord',
      token: code,
    });
    if (error) throw error;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'user',
        display_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
      });
    }

    const result = createAuthResponse(data.user.id, data.user.email!, data.user, req, res);
    res.json(result);
  } catch (error: any) {
    logger.error('Discord auth error:', error);
    res.status(400).json({ error: error.message || 'Authentication failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newTokens = await rotateRefreshToken(decoded.userId, decoded.refreshId);
    if (!newTokens) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const accessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
    });

    res.cookie('refreshToken', newTokens.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ token: accessToken, refreshToken: newTokens.token });
  } catch (error) {
    logger.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      const decoded = verifyRefreshToken(token);
      if (decoded) {
        await revokeRefreshToken(decoded.userId, decoded.refreshId);
      }
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout-all', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (decoded) {
      await revokeAllRefreshTokens(decoded.userId);
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = passwordResetSchema.parse(req.body);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin}/auth/reset-password`,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid email', details: error.errors });
    }
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = passwordUpdateSchema.parse(req.body);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const { data: user } = await supabase.auth.getUser(req.headers.authorization!.slice(7));
    if (!user.user?.email) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.user.email,
      password: currentPassword,
    });

    if (signInError) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    await revokeAllRefreshTokens(userId);
    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/2fa/setup', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const secret = authenticator.generateSecret();
    const serviceName = 'SyncSaga';
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const otpauth = authenticator.keyuri(profile?.email || userId, serviceName, secret);

    await supabase
      .from('profiles')
      .update({ totp_secret: secret })
      .eq('id', userId);

    const qrCode = await QRCode.toDataURL(otpauth);

    res.json({ secret, qrCode, uri: otpauth });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('totp_secret')
      .eq('id', userId)
      .single();

    if (!profile?.totp_secret) {
      return res.status(400).json({ error: '2FA not set up' });
    }

    const isValid = authenticator.verify({ token, secret: profile.totp_secret });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    await supabase
      .from('profiles')
      .update({ totp_enabled: true })
      .eq('id', userId);

    res.json({ success: true, message: '2FA enabled' });
  } catch (error) {
    logger.error('2FA verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/2fa/disable', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('totp_secret')
      .eq('id', userId)
      .single();

    if (!profile?.totp_secret) {
      return res.status(400).json({ error: '2FA not set up' });
    }

    const isValid = authenticator.verify({ token, secret: profile.totp_secret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    await supabase
      .from('profiles')
      .update({ totp_enabled: false, totp_secret: null })
      .eq('id', userId);

    res.json({ success: true, message: '2FA disabled' });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const keys = await redisService.getClient().keys(`refresh:${userId}:*`);
    const sessions = await Promise.all(
      keys.map(async (key) => {
        const ttl = await redisService.getClient().ttl(key);
        const refreshId = key.split(':').pop();
        return { refreshId, device: 'Unknown', expiresIn: ttl, createdAt: new Date(Date.now() - (7 * 86400 - ttl) * 1000).toISOString() };
      })
    );

    res.json({ sessions });
  } catch (error) {
    logger.error('Sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions/revoke', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { refreshId } = req.body;
    if (!refreshId) {
      return res.status(400).json({ error: 'Refresh ID required' });
    }

    await revokeRefreshToken(userId, refreshId);
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRouter };
