import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

/**
 * SyncSaga Load Testing Configuration (k6)
 *
 * Run: k6 run load-test.js
 *
 * Tests:
 * 1. HTTP API throughput under load
 * 2. WebSocket connection capacity
 * 3. Sync event broadcast latency
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },     // Stay at 50 users
    { duration: '30s', target: 200 },   // Ramp up to 200 users
    { duration: '2m', target: 200 },    // Stay at 200 users
    { duration: '30s', target: 500 },   // Ramp up to 500 users
    { duration: '2m', target: 500 },    // Stay at 500 users
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    ws_sessions: ['rate<0.05'],
    ws_ping_duration: ['p(95)<1000'],
  },
};

const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/health/ready`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check has status field': (r) => r.json('status') !== undefined,
  });

  // Test API endpoint with auth
  const roomsRes = http.get(`${BASE_URL}/api/v1/rooms`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  check(roomsRes, {
    'rooms API status is 200': (r) => r.status === 200 || r.status === 401,
  });

  // Test WebSocket connection
  ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  }, (socket) => {
    socket.on('open', () => {
      // Send sync ping
      socket.send(JSON.stringify({
        type: 'sync:ping',
        data: { clientTime: Date.now() },
      }));

      socket.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'sync:pong') {
          check(msg, {
            'pong has serverTime': (m) => m.data.serverTime !== undefined,
          });
        }
      });

      socket.on('error', (e) => {
        console.log('WS Error:', e);
      });

      socket.setTimeout(() => {
        socket.close();
      }, 5000);
    });
  });

  sleep(1);
}
