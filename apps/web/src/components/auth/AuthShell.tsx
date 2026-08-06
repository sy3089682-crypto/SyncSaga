'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

/**
 * AuthShell — shared chrome for every /auth screen.
 *
 * Signature element: a single breathing amber glow behind the icon —
 * the same "presence" language used for drift/online status in the room.
 * Here it means: someone is waiting on the other side of this door.
 */
export function AuthShell({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  width = 'sm',
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md';
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden bg-canvas">
      {/* Ambient corner wash — quiet, not a hero moment; this screen isn't the star */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--amber-glow), transparent 70%)' }}
      />

      <Link
        href="/"
        className="absolute top-6 left-6 text-sm font-medium no-underline z-10"
        style={{ color: 'var(--ink-mute)', fontFamily: 'var(--font-body)' }}
      >
        ← SyncSaga
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className={`relative w-full ${width === 'md' ? 'max-w-md' : 'max-w-sm'}`}
      >
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-amber-strong animate-sync-pulse" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface">
              <Icon className="h-5 w-5" style={{ color: 'var(--amber)' }} strokeWidth={1.75} />
            </span>
          </div>

          {eyebrow && (
            <p
              className="mb-2 text-xs font-medium uppercase"
              style={{ color: 'var(--ink-mute)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}
            >
              {eyebrow}
            </p>
          )}

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontSize: '1.875rem',
              letterSpacing: '-0.015em',
              color: 'var(--ink)',
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className="mt-2.5 mx-auto max-w-[280px]"
              style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-body)', fontWeight: 420, fontSize: '0.9375rem', lineHeight: 1.5 }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div
          className="rounded-lg border p-6 sm:p-7"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {children}
        </div>

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </motion.div>
    </div>
  );
}

/** Consistent field label — reused so every form on every screen matches. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="mb-1.5 block text-sm font-medium"
      style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-body)' }}
    >
      {children}
    </label>
  );
}

/** Inline form error — same voice everywhere: states what happened, not sorry-speak. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="rounded-md px-3 py-2 text-sm"
      style={{ background: 'rgba(252,165,165,0.08)', border: '1px solid rgba(252,165,165,0.18)', color: 'var(--error)' }}
    >
      {children}
    </p>
  );
}

/** Divider with centered label — "or continue with email" etc. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
      </div>
      <div className="relative flex justify-center">
        <span
          className="px-3 text-xs uppercase"
          style={{ background: 'var(--surface)', color: 'var(--ink-mute)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/** OAuth provider button — pill-free, matches DESIGN.md ("no pill shapes"). */
export function OAuthButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors"
      style={{ borderColor: 'var(--border)', color: 'var(--ink)', background: 'transparent', fontFamily: 'var(--font-body)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {children}
    </button>
  );
}

/** Success state — used after email sent, password reset, 2FA enabled, etc. */
export function AuthSuccess({
  icon: Icon,
  title,
  message,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  message: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 bg-canvas">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(74,224,158,0.1)' }}>
          <Icon className="h-6 w-6" style={{ color: 'var(--success)' }} strokeWidth={1.75} />
        </div>
        <h1
          className="mb-2.5"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.75rem', color: 'var(--ink)' }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-body)', fontWeight: 420, fontSize: '0.9375rem', lineHeight: 1.55 }}>
          {message}
        </p>
        {footer && <div className="mt-6">{footer}</div>}
      </motion.div>
    </div>
  );
}
