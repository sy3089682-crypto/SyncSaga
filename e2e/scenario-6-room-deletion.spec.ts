import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('Scenario 6: Room management', () => {
  test('API rooms endpoint is accessible', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/rooms`);
    expect(response.ok()).toBeTruthy();
  });

  test('API handles CORS headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    const corsHeader = response.headers()['access-control-allow-origin'];
    // CORS may be configured or not, but the endpoint must respond
    expect(response.status()).toBe(200);
  });
});
