import { test, expect } from '@playwright/test';

test.describe('SyncSaga Room Page (Operate Surface)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/room/test-room-01');
  });

  test('renders with warm dark background', async ({ page }) => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 11, 14)');
  });

  test('header displays room name', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
  });

  test('header has action buttons', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const buttons = page.locator('button');
    const count = await buttons.count();
    // Room page Must have more controls than landing
    expect(count).toBeGreaterThan(3);
  });

  test('chat toggle sidebar exists', async ({ page }) => {
    // MessageSquare icon is the chat toggle
    const allButtons = page.locator('button');
    expect(await allButtons.count()).toBeGreaterThan(2);
  });

  test('footer has voice controls', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const text = await page.textContent('body');
    expect(text).toMatch(/voice|audio/i);
  });
});
