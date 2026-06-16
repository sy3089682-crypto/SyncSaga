import { logger } from '../lib/logger';

class MetricsService {
  private counts: Record<string, number> = {};
  private latencies: Record<string, number[]> = {};
  private httpCounts: Record<string, number> = {};
  private connectedSockets = 0;

  init() {
    this.counts = {};
    this.latencies = {};
    this.httpCounts = {};
    this.connectedSockets = 0;
    logger.info('Metrics initialized');
  }

  incrementAiRequests(provider: string) {
    const key = `ai:requests:${provider}`;
    this.counts[key] = (this.counts[key] || 0) + 1;
  }

  observeAiLatency(provider: string, ms: number) {
    if (!this.latencies[provider]) this.latencies[provider] = [];
    this.latencies[provider].push(ms);
    if (this.latencies[provider].length > 100) this.latencies[provider].shift();
  }

  incrementHttp(method: string, path: string, statusCode: number) {
    const key = `${method}:${path}:${statusCode}`;
    this.httpCounts[key] = (this.httpCounts[key] || 0) + 1;
  }

  observeHttpDuration(method: string, path: string, ms: number) {
    const key = `http:duration:${method}:${path}`;
    if (!this.latencies[key]) this.latencies[key] = [];
    this.latencies[key].push(ms);
    if (this.latencies[key].length > 100) this.latencies[key].shift();
  }

  setConnectedSockets(count: number) {
    this.connectedSockets = count;
  }

  recordSyncDrift(driftMs: number) {
    const key = 'sync:drift';
    if (!this.latencies[key]) this.latencies[key] = [];
    this.latencies[key].push(driftMs);
    if (this.latencies[key].length > 100) this.latencies[key].shift();
  }

  getJsonMetrics() {
    const avgLatencies: Record<string, number> = {};
    for (const [key, vals] of Object.entries(this.latencies)) {
      avgLatencies[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    return {
      counts: { ...this.counts },
      avgLatencies,
      http: { ...this.httpCounts },
      sockets: { connected: this.connectedSockets },
      uptime: process.uptime(),
    };
  }

  getHealth() {
    return {
      initialized: true,
      uptime: process.uptime(),
      connectedSockets: this.connectedSockets,
    };
  }

  async getMetrics() {
    return this.getJsonMetrics();
  }
}

export const metrics = new MetricsService();
