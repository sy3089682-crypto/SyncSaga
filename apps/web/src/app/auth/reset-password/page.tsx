'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

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
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-500/10 p-4">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Password reset successful</h1>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              placeholder="Repeat your password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
