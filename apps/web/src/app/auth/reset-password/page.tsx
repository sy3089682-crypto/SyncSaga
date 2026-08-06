'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { AuthShell, FieldLabel, FormError, AuthSuccess } from '@/components/auth/AuthShell';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('code') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) return setError('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      if (token) {
        await api.post('/api/auth/reset-password', { token, newPassword });
      } else {
        const { error: supabaseError } = await supabase.auth.updateUser({ password: newPassword });
        if (supabaseError) throw new Error(supabaseError.message);
      }
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <AuthSuccess icon={CheckCircle2} title="Password reset" message="Taking you back to sign in…" />;
  }

  return (
    <AuthShell icon={KeyRound} title="Set a new password" subtitle="Make it something you'll remember this time.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>New password</FieldLabel>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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

        <div>
          <FieldLabel>Confirm password</FieldLabel>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
          />
        </div>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" variant="primary" size="md" className="w-full" isLoading={loading}>
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
