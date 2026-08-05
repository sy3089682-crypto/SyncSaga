# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Landing Page >> hero heading uses serif font
- Location: tests/e2e/landing.spec.ts:10:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Page', () => {
  4  |   test('page loads with warm dark background', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  7  |     expect(bg).toBe('rgb(10, 10, 12)');
  8  |   });
  9  | 
  10 |   test('hero heading uses serif font', async ({ page }) => {
> 11 |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
  12 |     const h1 = page.locator('h1').first();
  13 |     if (await h1.count() > 0) {
  14 |       const ff = await h1.evaluate(el => getComputedStyle(el).fontFamily);
  15 |       expect(ff).toMatch(/Fraunces|Georgia|serif/i);
  16 |     }
  17 |   });
  18 | 
  19 |   test('page contains watch/sync content', async ({ page }) => {
  20 |     await page.goto('/');
  21 |     const text = await page.textContent('body');
  22 |     expect(text).toMatch(/anime|watch|sync/i);
  23 |   });
  24 | 
  25 |   test('CTA buttons exist', async ({ page }) => {
  26 |     await page.goto('/');
  27 |     const buttons = page.getByRole('button');
  28 |     const count = await buttons.count();
  29 |     expect(count).toBeGreaterThan(0);
  30 |   });
  31 | });
  32 | 
```