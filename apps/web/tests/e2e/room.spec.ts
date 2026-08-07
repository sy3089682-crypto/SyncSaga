import { test, expect } from '@playwright/test';

test.describe('SyncSaga Room Page (Operate Surface)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/room/test-room-01');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('login page has OAuth buttons', async ({ page }) => {
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
    const googleBtn = page.getByRole('button', { name: 'Google' });
    const discordBtn = page.getByRole('button', { name: 'Discord' });
    await expect(googleBtn).toBeVisible();
    await expect(discordBtn).toBeVisible();
  });

  test('login page has email/password form', async ({ page }) => {
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
