import { Counter, Gauge, Histogram, register } from 'prom-client';

let initialized = false;

function ensureMetrics() {
  if (initialized) return;
  initialized = true;

  new Counter({ name: 'syncsaga_http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'path', 'status'] });
  new Counter({ name: 'syncsaga_http_errors_total', help: 'Total HTTP errors', labelNames: ['method', 'path'] });
  new Histogram({ name: 'syncsaga_http_request_duration_ms', help: 'HTTP request duration in ms', labelNames: ['method', 'path'], buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500] });
  new Gauge({ name: 'syncsaga_connected_sockets', help: 'Number of connected Socket.IO clients' });
  new Counter({ name: 'syncsaga_rooms_created_total', help: 'Total rooms created' });
  new Counter({ name: 'syncsaga_sync_events_total', help: 'Total sync events processed', labelNames: ['type'] });
  new Gauge({ name: 'syncsaga_active_rooms', help: 'Number of active rooms' });
  new Gauge({ name: 'syncsaga_redis_connected', help: 'Whether Redis is connected (1=yes, 0=no)' });
  new Counter({ name: 'syncsaga_ai_requests_total', help: 'Total AI requests', labelNames: ['provider'] });
  new Counter({ name: 'syncsaga_ws_messages_total', help: 'Total WebSocket messages', labelNames: ['event'] });
  new Histogram({ name: 'syncsaga_sync_drift_ms', help: 'Client sync drift in ms', buckets: [10, 25, 50, 100, 200, 500, 1000, 2000] });
}

export const metrics = {
  init() { ensureMetrics(); },

  incrementHttp(method: string, path: string, status: number) {
    register.getSingleMetric('syncsaga_http_requests_total')?.inc({ method, path, status: String(status) });
    if (status >= 400) {
      register.getSingleMetric('syncsaga_http_errors_total')?.inc({ method, path });
    }
  },

  observeHttpDuration(method: string, path: string, durationMs: number) {
    register.getSingleMetric('syncsaga_http_request_duration_ms')?.observe({ method, path }, durationMs);
  },

  setConnectedSockets(count: number) {
    register.getSingleMetric('syncsaga_connected_sockets')?.set(count);
  },

  incrementRoomsCreated() {
    register.getSingleMetric('syncsaga_rooms_created_total')?.inc();
  },

  incrementSyncEvents(type: string) {
    register.getSingleMetric('syncsaga_sync_events_total')?.inc({ type });
  },

  setActiveRooms(count: number) {
    register.getSingleMetric('syncsaga_active_rooms')?.set(count);
  },

  setRedisConnected(connected: boolean) {
    register.getSingleMetric('syncsaga_redis_connected')?.set(connected ? 1 : 0);
  },

  incrementAiRequests(provider: string) {
    register.getSingleMetric('syncsaga_ai_requests_total')?.inc({ provider });
  },

  incrementWsMessages(event: string) {
    register.getSingleMetric('syncsaga_ws_messages_total')?.inc({ event });
  },

  observeDrift(driftMs: number) {
    register.getSingleMetric('syncsaga_sync_drift_ms')?.observe(driftMs);
  },

  async getMetrics(): Promise<string> {
    ensureMetrics();
    return register.metrics();
  },

  async getMetricsJSON() {
    ensureMetrics();
    return register.getMetricsAsJSON();
  },
};
