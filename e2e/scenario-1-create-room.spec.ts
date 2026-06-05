import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('Scenario 1: Room creation', () => {
  test('API health check passes before creating room', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('API returns public rooms list', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/rooms`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('rooms');
    expect(Array.isArray(body.rooms)).toBeTruthy();
  });
});
