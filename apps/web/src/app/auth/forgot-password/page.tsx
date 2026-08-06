'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthShell, FieldLabel, FormError, AuthSuccess } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthSuccess
        icon={MailCheck}
        title="Check your email"
        message={
          <>
            If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>, a reset link is on
            its way.
          </>
        }
        footer={
          <Link href="/auth/login" className="text-sm font-medium" style={{ color: 'var(--amber)' }}>
            Back to sign in
          </Link>
        }
      />
    );
  }

  return (
    <AuthShell
      icon={Mail}
      title="Forgot your password?"
      subtitle="Tell us the email on your account and we'll send a reset link."
      footer={
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--ink-mute)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
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

        {error && <FormError>{error}</FormError>}

        <Button type="submit" variant="primary" size="md" className="w-full" isLoading={loading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
