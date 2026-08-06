'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Play, Users, Wand2, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

/* ======================================================================
 *  SYNCSAGA LANDING — "The Ceremony"
 *  Design language: Apple ✕ Linear. Warm, honest, deliberate.
 *  Amber accent (#E8A840) on warm near-black canvas (#0B0B0E).
 *  Fraunces display / Inter 420 body.
 *  One idea per section. No card grids. No AI slop.
 * ====================================================================== */

// ── Scroll-into-reveal wrapper ──────────────────────────────────
function RevealSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger children (container) ────────────────────────────────
function StaggerChildren({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger item ────────────────────────────────────────────────
function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring', damping: 24, stiffness: 200 },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Live sync dot (pulsing amber) ────────────────────────────────
function LiveDot() {
  return (
    <span className="sync-dot" style={{ width: 8, height: 8, display: 'inline-flex' }} />
  );
}

// ── Animated counter (spring-tweened to target) ─────────────────
function AnimatedCounter({
  value,
  suffix = '',
  className = '',
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsub = springValue.on('change', (latest) =>
      setDisplay(Math.round(latest).toLocaleString())
    );
    return unsub;
  }, [springValue]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

// ── Nav ──────────────────────────────────────────────────────────
function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 }}
      className="fixed top-0 inset-x-0 z-50"
      style={{
        background: 'rgba(11, 11, 14, 0.82)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="no-underline">
          <span
            className="select-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: 'var(--ink)',
            }}
          >
            SyncSaga
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium no-underline"
            style={{ color: 'var(--ink-soft)' }}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}

// ── How-it-works row (numbered, not icon+box) ───────────────────
function HowRow({
  step,
  title,
  body,
  icon: Icon,
}: {
  step: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <StaggerItem>
      <div
        className="flex gap-6"
        style={{
          padding: '28px 0',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <span
          className="shrink-0 pt-0.5"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--ink-faint)',
            minWidth: '2rem',
          }}
        >
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <Icon style={{ width: 18, height: 18, color: 'var(--amber)' }} />
            <h3
              className="font-medium leading-tight"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.0625rem',
                fontWeight: 500,
                color: 'var(--ink)',
              }}
            >
              {title}
            </h3>
          </div>
          <p
            className="max-w-lg leading-relaxed"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 420,
              fontSize: '0.9375rem',
              color: 'var(--ink-soft)',
              lineHeight: 1.6,
            }}
          >
            {body}
          </p>
        </div>
      </div>
    </StaggerItem>
  );
}

// ── Amber CTA button — hover spring animation ───────────────────
function AmberButton({
  children,
  href,
  large = false,
}: {
  children: React.ReactNode;
  href: string;
  large?: boolean;
}) {
  return (
    <Link href={href} className="no-underline">
      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        style={{
          background: 'var(--amber)',
          color: 'var(--canvas)',
          padding: large ? '0.85rem 2rem' : '0.8rem 1.75rem',
          fontSize: large ? '1.0625rem' : '1rem',
          fontWeight: 500,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 0 24px 2px rgba(232,168,64,0.15)',
          minHeight: 48,
          cursor: 'pointer',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.008em',
        }}
        className={className}
      >
        {children}
      </motion.button>
    </Link>
  );
}

// ── Ghost CTA button ────────────────────────────────────────────
function GhostButton({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="no-underline">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        style={{
          background: 'rgba(255,255,255,0.03)',
          color: 'var(--ink)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--radius-md)',
          padding: '0.7rem 1.4rem',
          fontSize: '0.9375rem',
          fontWeight: 500,
          minHeight: 48,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.008em',
          transition: 'border-color 0.2s ease',
        }}
      >
        {children}
      </motion.button>
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════
export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--canvas)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
        fontWeight: 420,
        letterSpacing: '0.008em',
      }}
    >
      <Nav />

      {/* ═══ HERO ═════════════════════════════════════════════ */}
      <main className="flex-1">
        <section
          className="container-medium flex flex-col items-center text-center"
          style={{ paddingTop: 'clamp(100px, 14vh, 160px)', paddingBottom: 'clamp(60px, 8vh, 100px)' }}
        >
          {/* Live indicator badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1], delay: 0.2 }}
            className="flex items-center gap-2 mb-8"
          >
            <Badge
              variant="success"
              size="md"
              style={{
                background: 'rgba(74, 224, 158, 0.1)',
                color: 'var(--success)',
                padding: '0.25rem 0.7rem',
                fontSize: '0.8125rem',
              }}
            >
              <LiveDot />
              <span style={{ fontWeight: 500 }}>3 rooms active</span>
            </Badge>
            <span
              className="text-xs"
              style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-body)', fontWeight: 420 }}
            >
              right now
            </span>
          </motion.div>

          {/* Hero title — spring fade-up */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.3 }}
            className="max-w-3xl"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: 'clamp(2.5rem, 7vw, 4.25rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              marginBottom: 'clamp(20px, 3vw, 28px)',
            }}
          >
            Watch anime together,
            <br />
            <span style={{ color: 'var(--amber)' }}>in perfect sync.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.45 }}
            className="max-w-xl"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 420,
              fontSize: '1.125rem',
              lineHeight: 1.6,
              color: 'var(--ink-soft)',
              marginBottom: 'clamp(32px, 5vw, 48px)',
            }}
          >
            Not a solo stream. A shared room — pick an anime, invite friends,
            and every pause, play, and frame stays locked for everyone.
          </motion.p>

          {/* CTA group */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center gap-3.5"
          >
            <amberButton href="/room/create">
              <Play style={{ width: 18, height: 18 }} />
              Start a Room
              <ArrowRight style={{ width: 16, height: 16, marginLeft: 2 }} />
            </amberButton>
            <GhostButton href="/search">Browse Anime</GhostButton>
          </motion.div>

          {/* Social proof stat */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex items-center gap-1.5 mt-10"
          >
            <span
              className="text-sm font-medium"
              style={{
                color: 'var(--ink)',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
              }}
            >
              Join{' '}
              <strong style={{ color: 'var(--amber)' }}>
                <AnimatedCounter value={12000} suffix="+" className="tabular-nums" />
              </strong>{' '}
              anime fans watching together
            </span>
          </motion.div>
        </section>

        {/* ═══ HOW IT WORKS ════════════════════════════════════ */}
        <section
          className="container-medium"
          style={{ paddingTop: 'clamp(40px, 6vh, 80px)', paddingBottom: 'clamp(60px, 8vh, 100px)' }}
        >
          <StaggerChildren>
            <HowRow
              step="01"
              title="Pick your anime"
              body="Search any title, select an episode — or let the group vote. We stay out of your way."
              icon={Play}
            />
            <HowRow
              step="02"
              title="Gather your crew"
              body="One link. That's it. Friends join instantly — no accounts required for guests. Voice and chat built in."
              icon={Users}
            />
            <HowRow
              step="03"
              title="Watch. React. Together."
              body="Every pause, play, and seek stays locked for everyone. React with emoji, clips, and commentary in real time."
              icon={Sparkles}
            />
          </StaggerChildren>
        </section>

        {/* ═══ THE PITCH ══════════════════════════════════════ */}
        <section
          className="container-narrow text-center"
          style={{ paddingTop: 'clamp(20px, 3vh, 40px)', paddingBottom: 'clamp(60px, 8vh, 100px)' }}
        >
          <RevealSection delay={0.1}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
                lineHeight: 1.16,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
                marginBottom: '0.5rem',
              }}
            >
              Watch parties, not streams
            </h2>
          </RevealSection>

          <RevealSection delay={0.2}>
            <p
              className="max-w-md mx-auto"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 420,
                fontSize: '0.9375rem',
                lineHeight: 1.65,
                color: 'var(--ink-soft)',
                marginBottom: '1.5rem',
              }}
            >
              Frame-synced playback means nobody&apos;s ahead. Voice, reactions,
              and clips happen in the moment — no delays, no drift.
            </p>
          </RevealSection>

          <RevealSection delay={0.3}>
            <div
              className="inline-flex items-center gap-4"
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(232,168,64,0.06)',
                border: '1px solid rgba(232,168,64,0.12)',
              }}
            >
              <Wand2 style={{ width: 17, height: 17, color: 'var(--amber)' }} />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
              >
                Sub-100ms sync precision
              </span>
            </div>
          </RevealSection>
        </section>

        {/* ═══ TESTIMONIAL ════════════════════════════════════ */}
        <section
          className="container-narrow"
          style={{ paddingTop: 'clamp(20px, 3vh, 40px)', paddingBottom: 'clamp(60px, 8vh, 100px)' }}
        >
          <RevealSection>
            <div
              className="text-center"
              style={{
                padding: 'clamp(32px, 5vw, 48px)',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <MessageCircle
                style={{
                  width: 24,
                  height: 24,
                  color: 'var(--amber)',
                  margin: '0 auto 1rem',
                  opacity: 0.65,
                }}
              />
              <blockquote
                className="max-w-lg mx-auto mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: '1.1875rem',
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                }}
              >
                &ldquo;It just works. Pasted the link, and three of us were
                watching the same frame instantly. No lag, no setup.
                This is how anime should be watched.&rdquo;
              </blockquote>
              <cite
                className="text-xs not-italic"
                style={{ color: 'var(--ink-mute)' }}
              >
                &mdash; everyone who&apos;s tried it
              </cite>
            </div>
          </RevealSection>
        </section>

        {/* ═══ FINAL CTA ═════════════════════════════════════ */}
        <section
          className="container-medium text-center"
          style={{ paddingTop: 'clamp(20px, 3vh, 40px)', paddingBottom: 'clamp(80px, 12vh, 140px)' }}
        >
          <RevealSection delay={0.1}>
            <h2
              className="mb-3"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
              }}
            >
              Ready to watch?
            </h2>
            <p
              className="max-w-sm mb-8 mx-auto"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 420,
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                color: 'var(--ink-soft)',
              }}
            >
              No ads. No algorithms. Just anime, together.
            </p>
            <amberButton href="/room/create" large>
              Start a Room
              <ArrowRight style={{ width: 16, height: 16 }} />
            </amberButton>
          </RevealSection>
        </section>
      </main>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div
          className="container-wide flex flex-col sm:flex-row items-center justify-between gap-3 py-8"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 420,
            fontSize: '0.75rem',
            color: 'var(--ink-mute)',
          }}
        >
          <span>© 2026 Syncsaga</span>
          <div className="flex items-center gap-6">
            <Link href="/search" className="no-underline" style={{ color: 'var(--ink-mute)' }}>
              Discover
            </Link>
            <Link href="/dashboard" className="no-underline" style={{ color: 'var(--ink-mute)' }}>
              Dashboard
            </Link>
            <Link href="/auth/login" className="no-underline" style={{ color: 'var(--ink-mute)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
