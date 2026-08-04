'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, Play, Radio, Search, Users } from 'lucide-react';

const ease = [0.22, 0.61, 0.36, 1] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-text-primary">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="syncsaga-wordmark" aria-label="SyncSaga home">SyncSaga<span className="text-primary">.</span></Link>
        <nav className="flex items-center gap-5 text-sm text-text-secondary" aria-label="Main navigation">
          <Link className="hidden transition-colors hover:text-text-primary sm:block" href="/search">Explore</Link>
          <Link className="hidden transition-colors hover:text-text-primary sm:block" href="/auth/login">Sign in</Link>
          <Link className="rounded-full border border-border px-4 py-2 text-text-primary transition-colors hover:border-primary/60" href="/auth/register">Join SyncSaga</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-36 lg:pt-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            <div className="mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-text-muted"><span className="size-2 rounded-full bg-accent-sync" />A better way to be together</div>
            <h1 className="max-w-xl font-display text-5xl leading-[0.98] tracking-[-0.055em] text-balance sm:text-7xl lg:text-[86px]">The night is better when everyone is <span className="text-primary">in sync.</span></h1>
            <p className="mt-8 max-w-md text-base leading-7 text-text-secondary sm:text-lg">A considered place for shared stories. Start a room, invite your people, and let every pause, laugh, and reaction happen together.</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/room/create" className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-[#1a0d0a] transition-transform hover:-translate-y-0.5"><Play className="size-4 fill-current" />Start a room<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
              <Link href="/search" className="flex items-center gap-2 rounded-full border border-border px-6 py-3.5 font-semibold text-text-primary transition-colors hover:border-primary/60"><Search className="size-4" />Find something to watch</Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.12, ease }} className="relative">
            <div className="overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2 text-sm"><Radio className="size-4 text-accent-sync" /><span>Friday night / 8:42 PM</span></div><span className="text-xs text-text-muted">LIVE ROOM</span></div>
              <div className="relative aspect-[1.18] overflow-hidden bg-[#211d1d] p-6 sm:p-10"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_30%,rgba(210,91,67,.3),transparent_45%),linear-gradient(135deg,#211d1d,#4e2725_45%,#171719)]" /><div className="relative flex h-full flex-col justify-between"><div className="flex items-start justify-between"><span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-white/70">Episode 07</span><span className="flex items-center gap-2 text-xs text-white/70"><span className="size-1.5 rounded-full bg-accent-sync" />4 watching</span></div><div><p className="font-display text-4xl tracking-tight text-white sm:text-6xl">A shared<br />moment.</p><div className="mt-6 flex items-center gap-3 text-xs text-white/60"><div className="h-px w-16 bg-white/40" />01:18:24 / 02:06:12</div></div></div></div>
              <div className="flex items-center justify-between px-5 py-4"><div className="flex -space-x-2" aria-label="Room members"><span className="size-7 rounded-full border-2 border-surface bg-primary/70" /><span className="size-7 rounded-full border-2 border-surface bg-accent-sync/70" /><span className="size-7 rounded-full border-2 border-surface bg-white/30" /></div><span className="text-xs text-text-muted">Everyone sees the same frame</span><button className="grid size-9 place-items-center rounded-full bg-primary text-[#1a0d0a]" aria-label="Play"><Play className="size-4 fill-current" /></button></div>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-border bg-surface/40"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3 lg:px-10"><Principle icon={<Users className="size-5" />} title="Made for people" copy="The room is the product. No noise, no feed to fight." /><Principle icon={<Radio className="size-5" />} title="Always in sync" copy="Playback, chat, and voice designed around the same shared moment." /><Principle icon={<Check className="size-5" />} title="Feels effortless" copy="The best technology disappears so the story can take over." /></div></section>

        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-36"><div className="flex flex-col justify-between gap-8 border-b border-border pb-10 sm:flex-row sm:items-end"><div><p className="text-xs uppercase tracking-[0.22em] text-primary">A place to return to</p><h2 className="mt-4 max-w-xl font-display text-4xl tracking-[-0.04em] sm:text-6xl">Keep the ritual.<br />Change the distance.</h2></div><p className="max-w-xs text-sm leading-6 text-text-secondary">From first episode to final credits, SyncSaga makes watching together feel natural — wherever everyone is.</p></div><div className="mt-10 flex items-center justify-between"><span className="text-sm text-text-muted">SyncSaga / 2026</span><Link href="/auth/register" className="group flex items-center gap-2 text-sm font-medium text-text-primary">Make a room <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Link></div></section>
      </main>
    </div>
  );
}

function Principle({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="flex gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-primary">{icon}</div><div><h3 className="font-medium">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-text-secondary">{copy}</p></div></div>;
}

// Force rebuild
// Force fresh build
