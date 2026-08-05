# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: room.spec.ts >> Room Page >> page renders with correct dark background
- Location: tests/e2e/room.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/room/test-room-id
Call log:
  - navigating to "http://localhost:3000/room/test-room-id", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Room Page', () => {
  4  |   test('page renders with correct dark background', async ({ page }) => {
> 5  |     await page.goto('/room/test-room-id');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/room/test-room-id
  6  |     const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  7  |     expect(bg).toBe('rgb(10, 10, 12)');
  8  |   });
  9  | 
  10 |   test('header has room name', async ({ page }) => {
  11 |     await page.goto('/room/test-room-id');
  12 |     await expect(page.locator('h1')).toBeVisible();
  13 |   });
  14 | 
  15 |   test('browser has interactive buttons', async ({ page }) => {
  16 |     await page.goto('/room/test-room-id');
  17 |     await page.waitForLoadState('networkidle');
  18 |     const buttons = page.locator('button');
  19 |     const count = await buttons.count();
  20 |     expect(count).toBeGreaterThan(2);
  21 |   });
  22 | });
  23 | 
```