import * as Sentry from '@sentry/nextjs';

/**
 * Sentry server-side initialization for Next.js.
 * Compatible with @sentry/nextjs v8+.
 */

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN || undefined,
  enabled: Boolean(SENTRY_DSN),

  // Performance monitoring on server
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Release tracking
  release: process.env.npm_package_version,

  // Environment
  environment: process.env.NODE_ENV,

  // beforeSend — redact sensitive headers
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});
