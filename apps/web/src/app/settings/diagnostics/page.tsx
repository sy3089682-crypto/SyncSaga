'use client';

import { ExtensionDiagnostics } from '@/components/extension/ExtensionDiagnostics';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DiagnosticsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Extension Diagnostics</h1>
          <p className="text-sm text-muted-foreground">Troubleshoot and debug your SyncSaga browser extension</p>
        </div>
      </div>
      <ExtensionDiagnostics />
    </div>
  );
}
