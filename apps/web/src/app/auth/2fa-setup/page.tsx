'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Shield, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

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
    api.post('/api/auth/2fa/setup', {}).then((data: any) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
    }).catch((err: any) => {
      setError(err.message || 'Failed to setup 2FA');
    }).finally(() => setLoading(false));
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-500/10 p-4">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">2FA enabled!</h1>
          <p className="text-muted-foreground">Two-factor authentication is now active on your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Set up two-factor auth</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scan the QR code with an authenticator app like Google Authenticator or Authy
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-surface-light border-t-primary" />
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              {qrCode ? (
                <img src={qrCode} alt="QR Code" className="rounded-xl border border-white/10" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-surface-light">
                  <AlertTriangle className="h-8 w-8 text-yellow-400" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Or enter this key manually:</p>
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">
                <code className="flex-1 text-sm font-mono">{secret}</code>
                <button onClick={handleCopy} className="text-primary hover:text-primary/80">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copied && <p className="text-xs text-green-400">Copied!</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">Verify code</label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center font-mono tracking-widest focus:border-primary focus:outline-none"
                placeholder="000 000"
                maxLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={verifying || verifyToken.length < 6}
            >
              {verifying ? 'Verifying...' : 'Enable 2FA'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
