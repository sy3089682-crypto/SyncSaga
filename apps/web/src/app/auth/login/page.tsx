'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Mail, DoorOpen } from 'lucide-react';
import Link from 'next/link';
import { signInWithOAuth } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { AuthShell, FieldLabel, FormError, OrDivider, OAuthButton } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
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
      icon={DoorOpen}
      eyebrow="Welcome back"
      title="Come on in"
      subtitle="Your rooms are right where you left them."
      footer={
        <p style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
          New here?{' '}
          <Link href="/auth/register" className="font-medium" style={{ color: 'var(--amber)' }}>
            Create an account
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
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Password</FieldLabel>
            <Link href="/auth/forgot-password" className="text-sm" style={{ color: 'var(--ink-mute)' }}>
              Forgot?
            </Link>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
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
          />
        </div>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" variant="primary" size="md" className="w-full" isLoading={loading}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
