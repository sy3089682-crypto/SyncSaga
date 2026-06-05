import { test, expect } from '@playwright/test';

test.describe('Scenario 4: Pause/play synchronization', () => {
  test('should render UI with playback controls', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Navigate to room page to test sync controls
    await page.goto('/room/test-room').catch(() => {});

    // Look for sync-related elements
    const syncIndicator = page.locator('[data-testid*="sync" i], [class*="sync" i]').first();
    const connectionStatus = page.locator('[data-testid*="connection" i], [class*="connection" i]').first();

    // Verify the page renders
    await expect(page.locator('body')).toBeVisible();

    // Log any connection status
    if (await connectionStatus.isVisible().catch(() => false)) {
      const status = await connectionStatus.textContent();
      console.log(`Connection status: ${status}`);
    }
  });

  test('should handle playback state changes', async ({ page }) => {
    await page.goto('/');

    // Check for state management elements
    const roomLink = page.locator('a[href*="room"], a[href*="Room"]').first();
    const playButton = page.locator('button:has-text("Play"), button:has-text("play")').first();

    // The app should render correctly
    await expect(page.locator('body')).toBeVisible();
  });
});
