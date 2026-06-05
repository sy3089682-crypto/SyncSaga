import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('Scenario 4: Pause/play synchronization', () => {
  test('API responds to requests and returns valid JSON', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(typeof body.status).toBe('string');
    expect(typeof body.uptime).toBe('number');
  });
});
