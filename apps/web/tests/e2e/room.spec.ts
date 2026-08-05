import { test, expect } from '@playwright/test';

test.describe('Room Page', () => {
  test('page renders with correct dark background', async ({ page }) => {
    await page.goto('/room/test-room-id');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(10, 10, 12)');
  });

  test('header has room name', async ({ page }) => {
    await page.goto('/room/test-room-id');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('browser has interactive buttons', async ({ page }) => {
    await page.goto('/room/test-room-id');
    await page.waitForLoadState('networkidle');
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(2);
  });
});
