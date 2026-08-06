'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Mail, AtSign, Armchair } from 'lucide-react';
import Link from 'next/link';
import { signInWithOAuth } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AuthShell, FieldLabel, FormError, OrDivider, OAuthButton } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUp(email, password, username);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'discord') => {
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'OAuth failed');
    }
  };

  return (
    <AuthShell
      icon={Armchair}
      eyebrow="First time"
      title="Save your seat"
      subtitle="One account, every room — hosts, history, and friends all in one place."
      footer={
        <p style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
          Already watching with us?{' '}
          <Link href="/auth/login" className="font-medium" style={{ color: 'var(--amber)' }}>
            Sign in
          </Link>
        </p>
      }
    >
      <div className="flex gap-3 mb-1">
        <OAuthButton onClick={() => handleOAuth('google')}>Google</OAuthButton>
        <OAuthButton onClick={() => handleOAuth('discord')}>Discord</OAuthButton>
      </div>

      <OrDivider label="or with email" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Username</FieldLabel>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="coolwatcher"
            icon={<AtSign className="h-4 w-4" />}
            required
            minLength={3}
          />
        </div>

        <div>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            required
          />
        </div>

        <div>
          <FieldLabel>Password</FieldLabel>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pointer-events-auto"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
            minLength={8}
          />
        </div>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" variant="primary" size="md" className="w-full" isLoading={loading}>
          Create account
        </Button>

        <p className="text-center text-xs" style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-body)' }}>
          By continuing, you agree to watch responsibly.
        </p>
      </form>
    </AuthShell>
  );
}
