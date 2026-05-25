import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { generateAccessToken, generateRefreshToken, storeRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../lib/jwt';
import { z } from 'zod';
import { logger } from '../lib/logger';

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
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: data.username,
        display_name: data.username,
      });
    }

    const accessToken = generateAccessToken({
      userId: authData.user!.id,
      email: data.email,
    });

    const refreshToken = generateRefreshToken({
      userId: authData.user!.id,
      email: data.email,
    });

    await storeRefreshToken(authData.user!.id, refreshToken.id);

    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ token: accessToken, refreshToken: refreshToken.token, user: authData.user });
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
    const data = loginSchema.parse(req.body);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken({
      userId: authData.user.id,
      email: authData.user.email!,
    });

    const refreshToken = generateRefreshToken({
      userId: authData.user.id,
      email: authData.user.email!,
    });

    await storeRefreshToken(authData.user.id, refreshToken.id);

    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ token: accessToken, refreshToken: refreshToken.token, user: authData.user });
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

    const accessToken = generateAccessToken({
      userId: data.user.id,
      email: data.user.email!,
    });

    const refreshToken = generateRefreshToken({
      userId: data.user.id,
      email: data.user.email!,
    });

    await storeRefreshToken(data.user.id, refreshToken.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'user',
        display_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
      });
    }

    res.cookie('refreshToken', refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({ token: accessToken, refreshToken: refreshToken.token, user: data.user });
  } catch (error: any) {
    logger.error('Google auth error:', error);
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

export { router as authRouter };
