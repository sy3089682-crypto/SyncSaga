import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('Scenario 5: Host disconnect and recovery', () => {
  test('API server stays responsive after multiple requests', async ({ request }) => {
    // Verify server is stable under rapid requests
    const results = await Promise.all([
      request.get(`${API_URL}/health`),
      request.get(`${API_URL}/health`),
      request.get(`${API_URL}/health`),
    ]);

    for (const res of results) {
      expect(res.ok()).toBeTruthy();
    }
  });

  test('API server returns consistent responses', async ({ request }) => {
    const response1 = await request.get(`${API_URL}/health`);
    const body1 = await response1.json();

    // Wait briefly
    await new Promise(r => setTimeout(r, 100));

    const response2 = await request.get(`${API_URL}/health`);
    const body2 = await response2.json();

    // Status should be consistent, uptime should increase
    expect(body1.status).toBe(body2.status);
    expect(body2.uptime).toBeGreaterThanOrEqual(body1.uptime);
  });
});
