'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

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
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card variant="glass" padding="lg" className="space-y-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 text-accent mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground dark:text-white">Check your email</h1>
              <p className="text-foreground-secondary dark:text-white/60">
                If an account exists for{' '}
                <span className="font-semibold text-foreground dark:text-white">{email}</span>, 
                you will receive a password reset link shortly.
              </p>
            </div>
            <div className="pt-4">
              <p className="text-sm text-foreground-secondary dark:text-white/60 mb-4">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-accent hover:text-green-600 dark:hover:text-green-500 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card variant="glass" padding="lg" className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white mb-2">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white">Forgot password?</h1>
            <p className="text-foreground-secondary dark:text-white/60">Enter your email and we'll send you a reset link</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="We'll send you a link to reset your password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={loading}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-green-600 dark:hover:text-green-500 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
