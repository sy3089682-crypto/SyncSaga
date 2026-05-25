const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

class Analytics {
  private userId: string | null = null;
  private posthogInitialized = false;

  init(userId?: string) {
    this.userId = userId || null;
    this.initPostHog();
    this.initSentry();
  }

  private initPostHog() {
    if (typeof window === 'undefined') return;
    if (!POSTHOG_KEY || this.posthogInitialized) return;
    try {
      const w = window as any;
      w.posthog = w.posthog || [];
      if (!w.posthog.__loaded) {
        w.posthog.init?.(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          capture_pageview: false,
          loaded: (ph: any) => {
            if (this.userId) ph.identify(this.userId);
          },
        });
      }
      this.posthogInitialized = true;
    } catch {}
  }

  private initSentry() {
    if (typeof window === 'undefined') return;
    if (!SENTRY_DSN) return;
    try {
      const w = window as any;
      if (!w.Sentry) {
        const script = document.createElement('script');
        script.src = 'https://browser.sentry-cdn.com/7.x/bundle.min.js';
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          w.Sentry?.init({ dsn: SENTRY_DSN, environment: process.env.NODE_ENV });
          if (this.userId) w.Sentry?.setUser({ id: this.userId });
        };
        document.head.appendChild(script);
      }
    } catch {}
  }

  capture(event: string, properties?: EventProperties) {
    if (typeof window === 'undefined') return;
    try {
      const w = window as any;
      if (w.posthog?.capture) {
        w.posthog.capture(event, properties);
      }
    } catch {}
  }

  identify(userId: string, traits?: EventProperties) {
    this.userId = userId;
    try {
      const w = window as any;
      if (w.posthog?.identify) w.posthog.identify(userId, traits);
      if (w.Sentry?.setUser) w.Sentry.setUser({ id: userId });
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
}

export const analytics = new Analytics();

export function trackPageview(path: string) {
  analytics.pageview(path);
}
