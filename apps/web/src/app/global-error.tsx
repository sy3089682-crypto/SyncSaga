'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-[100vh] flex-col items-center justify-center gap-6 p-8 bg-[#0a0a0a] text-white font-sans">
          <div className="rounded-full bg-red-500/10 p-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="h-12 w-12 text-red-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">System Failure</h2>
          <p className="max-w-md text-center text-zinc-400">
            A critical error occurred. Our engineering team has been automatically notified via Sentry.
          </p>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-lg font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              Try again
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 rounded-lg font-semibold border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
