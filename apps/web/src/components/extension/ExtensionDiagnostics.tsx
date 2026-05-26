'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Wifi, WifiOff, Clock, Activity, RefreshCw, AlertTriangle, CheckCircle, Video } from 'lucide-react';

interface DiagnosticResult {
  extensionInstalled: boolean;
  version: string | null;
  videoDetected: boolean;
  connected: boolean;
  roomJoined: boolean;
  wsLatency: number | null;
  lastSyncTime: number | null;
  drift: number | null;
  errors: string[];
}

function DiagnosticCard({ title, status, children }: { title: string; status: 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
  const colors = {
    good: 'border-green-500/20 bg-green-500/5',
    warn: 'border-yellow-500/20 bg-yellow-500/5',
    bad: 'border-red-500/20 bg-red-500/5',
  };
  const icons = {
    good: <CheckCircle className="h-5 w-5 text-green-400" />,
    warn: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
    bad: <AlertTriangle className="h-5 w-5 text-red-400" />,
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icons[status]}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function ExtensionDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult>({
    extensionInstalled: false,
    version: null,
    videoDetected: false,
    connected: false,
    roomJoined: false,
    wsLatency: null,
    lastSyncTime: null,
    drift: null,
    errors: [],
  });
  const [running, setRunning] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    const errors: string[] = [];
    const diagnostics: Partial<DiagnosticResult> = {};

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        diagnostics.extensionInstalled = true;
        diagnostics.version = chrome.runtime.getManifest()?.version || 'unknown';
        setExtensionAvailable(true);

        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            const state = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATE' });
            diagnostics.videoDetected = state?.hasVideo || state?.currentTime !== undefined || false;
          }
        } catch {
          errors.push('Could not communicate with content script');
        }

        try {
          const storage = await chrome.storage.local.get(['roomId', 'token']);
          diagnostics.roomJoined = !!storage.roomId;
        } catch {
          errors.push('Could not read extension storage');
        }
      } else {
        diagnostics.extensionInstalled = false;
        errors.push('Chrome extension API not available');
      }
    } catch (e: any) {
      errors.push(e.message || 'Unknown diagnostic error');
    }

    setResults(prev => ({ ...prev, ...diagnostics, errors }));
    setRunning(false);
  }, []);

  useEffect(() => {
    setExtensionAvailable(typeof chrome !== 'undefined' && !!chrome.runtime?.id);
    runDiagnostics();
  }, [runDiagnostics]);

  const status = results.errors.length > 0 ? 'bad' : results.extensionInstalled ? 'good' : 'warn';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Extension Diagnostics</h2>
          <p className="text-sm text-muted-foreground">Troubleshoot your SyncSaga browser extension</p>
        </div>
        <Button onClick={runDiagnostics} disabled={running} size="sm">
          <RefreshCw className={`mr-1 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Scanning...' : 'Run diagnostics'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DiagnosticCard title="Extension" status={results.extensionInstalled ? 'good' : 'warn'}>
          {results.extensionInstalled ? (
            <>Installed v{results.version}</>
          ) : (
            'Extension not detected. Install from Chrome Web Store.'
          )}
        </DiagnosticCard>

        <DiagnosticCard title="Video Detection" status={results.videoDetected ? 'good' : 'warn'}>
          {results.videoDetected ? (
            <div className="flex items-center gap-1"><Video className="h-3 w-3" /> Video element found</div>
          ) : 'No video element detected on this page'}
        </DiagnosticCard>

        <DiagnosticCard title="Connection" status={results.connected ? 'good' : results.roomJoined ? 'warn' : 'bad'}>
          {results.connected ? (
            <div className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Connected</div>
          ) : results.roomJoined ? (
            <div className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Reconnecting...</div>
          ) : (
            <div className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> Not connected</div>
          )}
        </DiagnosticCard>

        <DiagnosticCard title="Room" status={results.roomJoined ? 'good' : 'warn'}>
          {results.roomJoined ? 'Joined a room' : 'Not in a room'}
        </DiagnosticCard>

        <DiagnosticCard title="Latency" status={results.wsLatency !== null && results.wsLatency < 200 ? 'good' : results.wsLatency !== null ? 'warn' : 'warn'}>
          {results.wsLatency !== null ? `${results.wsLatency}ms` : 'N/A'}
        </DiagnosticCard>

        <DiagnosticCard title="Sync Drift" status={results.drift !== null && results.drift < 1000 ? 'good' : results.drift !== null ? 'warn' : 'warn'}>
          {results.drift !== null ? `${Math.round(results.drift)}ms` : 'N/A'}
        </DiagnosticCard>
      </div>

      {results.errors.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-red-400">Issues Found</h3>
          <ul className="space-y-1">
            {results.errors.map((err, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.extensionInstalled && !results.videoDetected && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <h3 className="mb-1 text-sm font-semibold text-yellow-400">No video detected</h3>
          <p className="text-sm text-yellow-300/80">
            Navigate to a page with an HTML5 video player (e.g., YouTube, Crunchyroll) and run diagnostics again.
          </p>
        </div>
      )}
    </div>
  );
}
