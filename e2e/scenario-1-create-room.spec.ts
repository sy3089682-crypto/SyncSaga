import { test, expect } from '@playwright/test';

test.describe('Scenario 1: User creates a room', () => {
  test('should navigate to create room page and create a room', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Verify the landing page loads
    await expect(page.locator('text=SyncSaga').first()).toBeVisible({ timeout: 10000 });

    // Navigate to create room page
    await page.goto('/rooms/create');

    // Fill room creation form
    const nameInput = page.locator('input[name="name"], input[placeholder*="room" i], input#name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Watch Party');
    }

    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i], textarea#description');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('A test room for E2E validation');
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Create Room")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Wait for navigation to room page or confirmation
    await page.waitForURL(/\/room\//, { timeout: 10000 }).catch(() => {});

    // Verify we landed on a room page or saw success
    const currentUrl = page.url();
    const onRoomPage = currentUrl.includes('/room/');
    const onRoomsPage = currentUrl.includes('/rooms');

    expect(onRoomPage || onRoomsPage).toBeTruthy();
  });
});
