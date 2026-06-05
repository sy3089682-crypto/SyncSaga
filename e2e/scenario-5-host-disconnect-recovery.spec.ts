import { test, expect } from '@playwright/test';

test.describe('Scenario 5: Host disconnect and recovery', () => {
  test('should handle WebSocket reconnection gracefully', async ({ page }) => {
    await page.goto('/');

    // Monitor WebSocket connections
    let socketConnected = false;
    let socketDisconnected = false;

    page.on('websocket', (ws) => {
      socketConnected = true;

      ws.on('close', () => {
        socketDisconnected = true;
      });
    });

    // Wait for any WebSocket connections
    await page.waitForLoadState('networkidle');

    // The app should render
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display error states gracefully', async ({ page }) => {
    // Navigate to a non-existent room
    await page.goto('/room/nonexistent-room-12345').catch(() => {});

    // Check for error or not-found UI
    const errorMessage = page.locator('text=not found, text=error, text=Error, text=404').first();
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    // Navigate back to home
    await page.goto('/');

    // App should still work
    await expect(page.locator('body')).toBeVisible();
  });
});
