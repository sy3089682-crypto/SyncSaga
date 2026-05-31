import { logger } from '../../logger';

export type ProviderName = 'groq' | 'gemini' | 'cloudflare';

export interface ProviderHealth {
  available: boolean;
  lastCheck: number;
  failures: number;
  totalRequests: number;
  avgLatency: number;
  lastError?: string;
}

class ProviderHealthTracker {
  private health = new Map<ProviderName, ProviderHealth>();
  private readonly MAX_FAILURES = 5;
  private readonly COOLDOWN_MS = 60_000;

  recordSuccess(name: ProviderName, latencyMs: number) {
    const h = this.getHealth(name);
    h.available = true;
    h.failures = 0;
    h.totalRequests++;
    h.lastCheck = Date.now();
    h.avgLatency = h.avgLatency === 0
      ? latencyMs
      : (h.avgLatency * 0.9 + latencyMs * 0.1);
  }

  recordFailure(name: ProviderName, error: string) {
    const h = this.getHealth(name);
    h.failures++;
    h.lastError = error;
    h.lastCheck = Date.now();

    if (h.failures >= this.MAX_FAILURES) {
      h.available = false;
      logger.warn({ provider: name, failures: h.failures }, 'Provider marked unavailable');
      setTimeout(() => {
        h.available = true;
        h.failures = 0;
        logger.info({ provider: name }, 'Provider cooldown expired, marking available');
      }, this.COOLDOWN_MS);
    }
  }

  isAvailable(name: ProviderName): boolean {
    const h = this.health.get(name);
    if (!h) return true;
    if (!h.available && Date.now() - h.lastCheck > this.COOLDOWN_MS) {
      h.available = true;
      h.failures = 0;
    }
    return h.available;
  }

  getHealth(name: ProviderName): ProviderHealth {
    if (!this.health.has(name)) {
      this.health.set(name, {
        available: true,
        lastCheck: Date.now(),
        failures: 0,
        totalRequests: 0,
        avgLatency: 0,
      });
    }
    return this.health.get(name)!;
  }

  getStats(): Record<ProviderName, ProviderHealth> {
    const stats: Record<string, ProviderHealth> = {};
    for (const [name, h] of this.health.entries()) {
      stats[name] = { ...h };
    }
    return stats as Record<ProviderName, ProviderHealth>;
  }
}

export const providerHealth = new ProviderHealthTracker();
