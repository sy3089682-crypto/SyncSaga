import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flow.
 */

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/SyncSaga/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show register link on login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
  });

  test('should show register page', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  test('should validate email format on login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    // Should show validation error or stay on page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect unauthenticated users from room to login', async ({ page }) => {
    await page.goto('/room/test-room-id');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Navigation', () => {
  test('should show landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    // Landing page should be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have discover page accessible', async ({ page }) => {
    await page.goto('/discover');
    // Should redirect to login or show discover page
    await expect(page).toHaveURL(/\/(discover|auth\/login)/);
  });
});
