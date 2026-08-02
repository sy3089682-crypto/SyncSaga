const { chromium } = require('playwright');

async function testQuick() {
  console.log('=== QUICK STATE CHECK ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  try {
    // Login
    console.log('1. Login...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load' });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    await page.waitForTimeout(3000);
    console.log('   ✅ Login successful');

    // Dashboard
    console.log('\n2. Dashboard...');
    const dashText = await page.evaluate(() => document.body.innerText);
    console.log(`   Full dashboard text:`);
    console.log(dashText);

    // Home page (unauthenticated to see demo)
    console.log('\n3. Home page (after logout)...');
    const logoutBtn = await page.$('button:has-text("Logout"), button:has-text("Sign out")');
    if (logoutBtn) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      const homeText = await page.evaluate(() => document.body.innerText);
      console.log(`   Home page (first 1000): ${homeText.substring(0, 1000)}`);
    }

    // Search page
    console.log('\n4. Search page...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log(`   Search page (first 1500): ${searchText.substring(0, 1500)}`);

    // Room create page
    console.log('\n5. Room create page...');
    await page.goto('https://syncsaga.vercel.app/room/create', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const createText = await page.evaluate(() => document.body.innerText);
    console.log(`   Room create (first 1500): ${createText.substring(0, 1500)}`);

  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
}

testQuick().catch(console.error);
