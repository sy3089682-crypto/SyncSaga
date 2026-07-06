'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', check: (pwd: string) => pwd.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', check: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: 'number', label: 'One number', check: (pwd: string) => /\d/.test(pwd) },
  { id: 'special', label: 'One special character', check: (pwd: string) => /[!@#$%^&*]/.test(pwd) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const passwordMeetsRequirements = passwordRequirements.every(req => req.check(password));
  const canSubmit = username && email && passwordMeetsRequirements && passwordsMatch && agreedToTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card variant="glass" padding="lg" className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-green-600 text-white mb-2">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white">Create account</h1>
            <p className="text-foreground-secondary dark:text-white/60">Join our community and get started</p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-2">
            <Button variant="secondary" size="md" fullWidth>
              Sign up with Google
            </Button>
            <Button variant="secondary" size="md" fullWidth>
              Sign up with GitHub
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-black/50 px-2 text-xs text-foreground-secondary dark:text-white/60">
                Or sign up with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Username"
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              helperText="3-30 characters, letters, numbers, and underscores only"
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              iconPosition="right"
              icon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-foreground-secondary dark:text-white/60 hover:text-foreground dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            {/* Password Requirements */}
            {password && (
              <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                {passwordRequirements.map((req) => {
                  const isMet = req.check(password);
                  return (
                    <div key={req.id} className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 ${
                          isMet
                            ? 'text-accent'
                            : 'text-gray-300 dark:text-white/20'
                        }`}
                      />
                      <span className={isMet ? 'text-accent' : 'text-foreground-secondary dark:text-white/40'}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Input
              label="Confirm password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={password && !passwordsMatch ? 'Passwords do not match' : ''}
              iconPosition="right"
              icon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-foreground-secondary dark:text-white/60 hover:text-foreground dark:hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            {/* Terms & Conditions */}
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded border border-gray-300 dark:border-white/20 cursor-pointer"
                required
              />
              <span className="text-foreground-secondary dark:text-white/60">
                I agree to the{' '}
                <a href="#" className="text-accent hover:text-green-600 dark:hover:text-green-500 font-medium">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="#" className="text-accent hover:text-green-600 dark:hover:text-green-500 font-medium">
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={loading}
              disabled={!canSubmit}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center text-sm text-foreground-secondary dark:text-white/60">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-accent hover:text-green-600 dark:hover:text-green-500 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
