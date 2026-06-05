import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('Scenario 2: Room joining', () => {
  test('API root endpoints are reachable', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: { 'Accept': 'application/json' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('API returns error for non-existent room', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/rooms/nonexistent-room-id`);
    expect(response.status()).toBe(404);
  });
});
