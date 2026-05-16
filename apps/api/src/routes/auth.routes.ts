import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { generateToken } from '../lib/jwt';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(30),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create profile
    if (authData.user) {
      await supabase.from('profiles').insert({
        id: authData.user.id,
        username: data.username,
        display_name: data.username,
      });
    }

    const token = generateToken({
      userId: authData.user!.id,
      email: data.email,
    });

    res.json({ token, user: authData.user });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const token = generateToken({
      userId: authData.user.id,
      email: data.user.email!,
    });

    res.json({ token, user: authData.user });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

router.post('/google', async (req, res) => {
  const { code } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: code,
    });

    if (error) throw error;

    const token = generateToken({
      userId: data.user.id,
      email: data.user.email!,
    });

    // Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'user',
        display_name: data.user.user_metadata.full_name,
        avatar_url: data.user.user_metadata.avatar_url,
      });
    }

    res.json({ token, user: data.user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as authRouter };
