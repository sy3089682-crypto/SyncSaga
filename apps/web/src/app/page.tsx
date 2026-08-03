import Link from 'next/link';
import { Tv, Users, Search, MessageSquare, Radio, Sparkles } from 'lucide-react';

/* ============================================================
   SyncSaga - Landing
   Real watch-party platform. No demo data.
   ============================================================ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-6 max-w-6xl mx-auto w-full">
        <span className="syncsaga-wordmark">SyncSaga</span>
        <nav className="flex items-center gap-4">
          <Link href="/search" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Browse Anime
          </Link>
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-lg bg-surface-light border border-border text-sm font-medium hover:border-primary/50 transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto w-full py-16">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-light border border-border mb-8 text-xs text-text-secondary">
          <Radio className="w-3.5 h-3.5 text-primary" />
          Realtime synchronized watch parties
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
          Watch anime together,
          <br />
          <span className="text-primary">in perfect sync.</span>
        </h1>

        <p className="text-text-secondary text-lg mb-10 max-w-xl">
          Host a room, pick any anime, and stream it with friends -
          every pause, play, and frame stays in sync for everyone.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-14">
          <Link
            href="/room/create"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 text-lg"
          >
            <Tv className="w-5 h-5" />
            Create Room
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-surface-light border border-border font-semibold hover:border-primary/50 transition-colors text-lg"
          >
            <Search className="w-5 h-5" />
            Browse Anime
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div className="p-5 rounded-2xl bg-surface border border-border text-left">
            <Users className="w-5 h-5 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Live Rooms</h3>
            <p className="text-sm text-text-secondary">
              Create private or public rooms and invite your crew.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-surface border border-border text-left">
            <MessageSquare className="w-5 h-5 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Built-in Chat</h3>
            <p className="text-sm text-text-secondary">
              React, message, and react to scenes in real time.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-surface border border-border text-left">
            <Sparkles className="w-5 h-5 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Frame Sync</h3>
            <p className="text-sm text-text-secondary">
              Sub-frame sync keeps everyone on the same moment.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© 2026 SyncSaga</span>
          <div className="flex items-center gap-6">
            <Link href="/search" className="hover:text-text-secondary transition-colors">Discover</Link>
            <Link href="/dashboard" className="hover:text-text-secondary transition-colors">Dashboard</Link>
            <Link href="/auth/login" className="hover:text-text-secondary transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
