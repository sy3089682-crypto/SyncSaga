const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

let posthogInstance: any = null;
let sentryInitialized = false;

class Analytics {
  private userId: string | null = null;

  init(userId?: string) {
    this.userId = userId || null;
    this.initPostHog(userId);
    this.initSentry(userId);
  }

  private initPostHog(userId?: string) {
    if (typeof window === 'undefined') return;
    if (!POSTHOG_KEY || posthogInstance) return;
    import('posthog-js').then((posthog) => {
      posthogInstance = posthog.default.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        loaded: (ph: any) => {
          if (userId) ph.identify(userId);
        },
      });
    }).catch(() => {});
  }

  private initSentry(userId?: string) {
    if (typeof window === 'undefined') return;
    if (!SENTRY_DSN || sentryInitialized) return;
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
      sentryInitialized = true;
      if (userId) Sentry.setUser({ id: userId });
    }).catch(() => {});
  }

  capture(event: string, properties?: EventProperties) {
    if (typeof window === 'undefined') return;
    try {
      if (posthogInstance?.capture) {
        posthogInstance.capture(event, properties);
      }
    } catch {}
  }

  identify(userId: string, traits?: EventProperties) {
    this.userId = userId;
    try {
      if (posthogInstance?.identify) posthogInstance.identify(userId, traits);
    } catch {}
  }

  pageview(path: string) {
    this.capture('$pageview', { path });
  }

  trackRoomJoin(roomId: string, roomName: string) {
    this.capture('room_join', { roomId, roomName });
  }

  trackRoomCreate(roomId: string) {
    this.capture('room_create', { roomId });
  }

  trackSyncFailure(roomId: string, drift: number) {
    this.capture('sync_failure', { roomId, drift });
  }

  trackReconnect(attempts: number) {
    this.capture('reconnect', { attempts });
  }

  trackExtensionEvent(event: string, data?: EventProperties) {
    this.capture(`extension_${event}`, data);
  }

  trackAchievementUnlocked(achievementId: string, name: string) {
    this.capture('achievement_unlocked', { achievementId, name });
  }

  trackOnboardingStep(step: string) {
    this.capture('onboarding_step', { step });
  }

  trackRoomDuration(roomId: string, durationMinutes: number) {
    this.capture('room_duration', { roomId, durationMinutes });
  }

  trackAiRequest(feature: string, provider: string, latencyMs: number, success: boolean) {
    this.capture('ai_request', { feature, provider, latencyMs, success });
  }

  trackAiFailure(feature: string, provider: string, error: string) {
    this.capture('ai_failure', { feature, provider, error });
  }

  trackFeatureFlag(flag: string, enabled: boolean) {
    this.capture('feature_flag', { flag, enabled });
  }
}

export const analytics = new Analytics();

export function trackPageview(path: string) {
  analytics.pageview(path);
}
