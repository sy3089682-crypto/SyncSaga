'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="bg-[#0d1117] text-[#e6edf3] flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
          <p className="text-[#8b949e] text-sm mb-6">{error.message || 'SyncSaga encountered a critical error'}</p>
          <button onClick={reset} className="px-6 py-2 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] font-medium">Reload</button>
        </div>
      </body>
    </html>
  )
}
