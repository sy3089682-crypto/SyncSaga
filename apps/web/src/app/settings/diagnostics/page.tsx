'use client';

import { ExtensionDiagnostics } from '@/components/extension/ExtensionDiagnostics';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-1.5 text-sm"
          style={{ color: 'var(--ink-mute)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Settings
        </Link>
        <h1
          className="mb-2"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.75rem', color: 'var(--ink)' }}
        >
          Extension diagnostics
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Check that the browser extension can talk to this tab.
        </p>
        <ExtensionDiagnostics />
      </div>
    </div>
  );
}
