import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('Scenario 3: Playback synchronization', () => {
  test('API health check reports service status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('environment');
  });
});
