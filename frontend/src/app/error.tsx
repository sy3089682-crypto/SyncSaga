'use client'

import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary fallback={
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="card p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-bold mb-2">Page Error</h2>
        <p className="text-surface-400 text-sm mb-6">{error.message || 'An unexpected error occurred'}</p>
        <button onClick={reset} className="btn-primary">Try Again</button>
      </div>
    </div>
  }>
    <div />
  </ErrorBoundary>
}
