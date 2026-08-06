'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Shield, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthShell, FieldLabel, FormError, AuthSuccess } from '@/components/auth/AuthShell';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .post('/api/auth/2fa/setup', {})
      .then((data: any) => {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      })
      .catch((err: any) => setError(err.message || 'Failed to set up 2FA'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleVerify = async () => {
    setVerifying(true);
    setError('');
    try {
      await api.post('/api/auth/2fa/verify', { token: verifyToken });
      setEnabled(true);
      setTimeout(() => router.push('/settings'), 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (enabled) {
    return (
      <AuthSuccess
        icon={ShieldCheck}
        title="Two-factor is on"
        message="Your account now asks for a code every time you sign in."
      />
    );
  }

  return (
    <AuthShell
      icon={Shield}
      eyebrow="Account security"
      title="Set up two-factor auth"
      subtitle="Scan this with Google Authenticator, Authy, or any TOTP app."
      width="md"
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <div
            className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-center">
            {qrCode ? (
              <div className="rounded-lg p-3" style={{ background: '#fff' }}>
                <img src={qrCode} alt="Scan to enable two-factor authentication" className="rounded" width={176} height={176} />
              </div>
            ) : (
              <div
                className="flex h-44 w-44 items-center justify-center rounded-lg"
                style={{ background: 'var(--elevated)' }}
              >
                <AlertTriangle className="h-7 w-7" style={{ color: 'var(--error)' }} />
              </div>
            )}
          </div>

          <div>
            <FieldLabel>Or enter this key manually</FieldLabel>
            <div
              className="flex items-center gap-2 rounded-md px-3.5 py-2.5"
              style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}
            >
              <code className="flex-1 text-sm truncate" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                {secret}
              </code>
              <button
                onClick={handleCopy}
                aria-label="Copy key"
                style={{ color: copied ? 'var(--success)' : 'var(--amber)' }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <FieldLabel>Verify code</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-md border px-4 py-2.5 text-center outline-none transition-colors"
              style={{
                background: 'var(--canvas)',
                borderColor: 'var(--border)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.25rem',
                letterSpacing: '0.4em',
              }}
            />
          </div>

          {error && <FormError>{error}</FormError>}

          <Button
            onClick={handleVerify}
            variant="primary"
            size="md"
            className="w-full"
            isLoading={verifying}
            disabled={verifyToken.length < 6}
          >
            Enable 2FA
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
