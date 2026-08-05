import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('page loads with warm dark background', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(10, 10, 12)');
  });

  test('hero heading uses serif font', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1').first();
    if (await h1.count() > 0) {
      const ff = await h1.evaluate(el => getComputedStyle(el).fontFamily);
      expect(ff).toMatch(/Fraunces|Georgia|serif/i);
    }
  });

  test('page contains watch/sync content', async ({ page }) => {
    await page.goto('/');
    const text = await page.textContent('body');
    expect(text).toMatch(/anime|watch|sync/i);
  });

  test('CTA buttons exist', async ({ page }) => {
    await page.goto('/');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
