import { test, expect } from '@playwright/test';

test.describe('SyncSaga Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has warm dark background', async ({ page }) => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 11, 14)');
  });

  test('hero has display serif heading', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const fontFamily = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(fontFamily).toMatch(/Fraunces|serif/i);
  });

  test('hero contains sync/watch messaging', async ({ page }) => {
    const content = await page.textContent('body');
    expect(content).toMatch(/anime|watch|sync/i);
  });

  test('CTA button is visible', async ({ page }) => {
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('live indicator is present', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toMatch(/live|rooms|join/i);
  });
});
