import * as Sentry from '@sentry/nextjs';

/**
 * Sentry initialization for Next.js frontend.
 *
 * This file is automatically loaded by Next.js when SENTRY_DSN
 * is set. It configures:
 * - Error tracking
 * - Performance monitoring (traces)
 * - Session replay (for debugging)
 * - Source map upload (in production)
 *
 * The instrumentation hook (instrumentation.ts) calls this on
 * the server side, and Next.js automatically wraps the client.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

export function register() {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance monitoring — sample 10% in production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay — sample 1% in production, 10% in dev
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,

    // Always capture replays on errors
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.npm_package_version,

    // Environment
    environment: process.env.NODE_ENV,

    // Ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'AbortError',
    ],

    // beforeSend — redact sensitive data
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-csrf-token'];
      }
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^\//,
          /^https:\/\/syncsaga\.vercel\.app/,
          /^https:\/\/api\.syncsaga\.app/,
        ],
      }),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });
}
