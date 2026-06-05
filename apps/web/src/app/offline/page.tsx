'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-black mb-2">You're Offline</h1>
        <p className="text-[#444] mb-6">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="bg-[#00d4ff] text-black font-bold px-6 py-3 hover:bg-[#00b8d9] transition-colors">
          Try Again
        </button>
      </div>
    </div>
  )
}
