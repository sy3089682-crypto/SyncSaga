import * as Sentry from '@sentry/node';
import { getEnv } from '@syncsaga/config';

let initialized = false;

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Called once at server startup.
 */
export function initSentry(): void {
  if (initialized) return;

  const env = getEnv();
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    beforeSend(event) {
      // Redact sensitive information
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  initialized = true;
}

/**
 * Sentry error handler middleware — must be registered after all routes
 * but before the custom error handler.
 */
export function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

/**
 * Capture an exception with optional context.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (initialized && context) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
  } else if (initialized) {
    Sentry.captureException(error);
  }
}

export { Sentry };
