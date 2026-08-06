'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play, Users, Sparkles, Tv, MessageCircle } from 'lucide-react';

/* ── Motion helpers ── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0, duration: 0.55 } },
};

function RevealSection({ children, id }: { children: React.ReactNode; id?: string }) {
  const ref = useRef<HTMLDivElement>(null!);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.section ref={ref} id={id}
      initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={stagger}>
      {children}
    </motion.section>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink overflow-hidden">

      {/* ════ HERO ════ */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] text-center px-4">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 38%, rgba(232,168,64,0.06) 0%, transparent 70%)',
        }} />
        <motion.div initial="hidden" animate="visible" variants={stagger}
          className="relative z-10 max-w-2xl flex flex-col items-center gap-5">
          <motion.span variants={fadeUp}
            className="text-xs font-medium uppercase tracking-[0.18em] text-amber">
            Watch Together
          </motion.span>
          <motion.h1 variants={fadeUp} className="display text-ink leading-[1.05]">
            Watch anime with<br/>anyone,&nbsp;
            <span className="text-amber relative inline-block">
              perfectly in sync
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent 0%, var(--amber) 30%, var(--amber) 70%, transparent 100%)' }} />
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-ink-soft max-w-md leading-relaxed">
            No lag. No desync. No solo watching.<br/>
            Join a room, queue your anime, and hear your<br/>friends react — like sitting in the same room.
          </motion.p>
          <motion.div variants={fadeUp} className="flex gap-3 pt-1">
            <motion.button whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-medium text-sm
                         bg-amber text-canvas shadow-[0_0_24px_2px_rgba(232,168,64,0.12)]
                         hover:bg-amber-hover hover:shadow-[0_0_32px_4px_rgba(232,168,64,0.2)]
                         transition-all duration-200">
              <Play className="w-4 h-4" /> Start a Room
            </motion.button>
            <button className="card p-3 rounded-xl font-medium text-ink text-sm bg-surface border border-border hover:border-border-hover transition-all duration-200">
              <Sparkles className="w-4 h-4" /> See Live
            </button>
          </motion.div>
          <motion.div variants={fadeUp} className="flex items-center gap-2 mt-2">
            <span className="sync-dot relative flex w-2 h-2 rounded-full ml-[-3px]" />
            <span className="text-ink-soft flex items-center gap-2">
              <strong className="text-amber font-medium">3</strong> rooms live —&nbsp;
              <a href="#features" className="text-amber-text hover:text-amber transition-colors">
                join the lobby
              </a>
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ════ FEATURES ════ */}
      <RevealSection id="features">
        <div className="container-medium grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Create or join', desc: 'Share the link. No login dance.' },
            { step: '02', title: 'Sync & watch', desc: 'Same frame. Same time. Always.' },
            { step: '03', title: 'React together', desc: 'Voice + reactions — presence.' },
          ].map((item) => (
            <motion.div key={item.step} variants={fadeUp}
              className="card p-6 flex flex-col items-start gap-4">
              <span className="mono text-amber text-sm">{item.step}</span>
              <h3 className="text-lg font-medium text-ink">{item.title}</h3>
              <p className="text-ink-soft text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* ════ EXPERIENCE DETAILS ════ */}
      <RevealSection>
        <div className="container-medium flex flex-col gap-12">
          {[
            { t: 'Voice like presence', d: 'Spatial audio — a room, not a choir.' },
            { t: 'Scrubber is precise', d: '4px track, amber fill. Frame accuracy.' },
            { t: 'One accent only', d: 'Golden amber — candlelight warmth. No purple.' },
          ].map((item) => (
            <motion.div key={item.t} variants={fadeUp} className="max-w-lg">
              <h2 className="font-display text-2xl mb-3 text-ink">{item.t}</h2>
              <p className="text-ink-soft leading-relaxed">{item.d}</p>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* ════ CTA ════ */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
        className="w-full text-center py-24">
        <div className="flex flex-col items-center gap-2">
          <h2 className="display-sm text-ink">Ready to watch with friends?</h2>
          <p className="text-ink-soft mb-4">No ads. No algorithms. Just anime, shared.</p>
          <motion.button whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm
                       bg-amber text-canvas shadow-[0_0_28px_2px_rgba(232,168,64,0.15)]
                       hover:bg-amber-hover transition-all duration-200">
            <MessageCircle className="w-4 h-4" /> Get Started
          </motion.button>
        </div>
      </motion.section>
    </main>
  );
}
