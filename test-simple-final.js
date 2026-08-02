const { chromium } = require('playwright');

async function testSimpleFinal() {
  console.log('=== SIMPLE FINAL TEST ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
  });

  try {
    // Login
    console.log('1. Login...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load' });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    await page.waitForTimeout(5000);
    console.log('   ✅ Login successful');
    console.log(`   URL: ${page.url()}`);
    
    // Get full dashboard content
    const dashText = await page.evaluate(() => document.body.innerText);
    console.log(`\n2. Dashboard content (full):`);
    console.log(dashText);
    
    // Check for create room link
    console.log('\n3. Looking for Create Room...');
    const createLink = await page.$('a:has-text("Create Room"), a:has-text("start a room"), a[href*="create"], button:has-text("Create Room")');
    if (createLink) {
      console.log('   ✅ Create Room link found');
      await createLink.click();
      await page.waitForTimeout(5000);
      const createText = await page.evaluate(() => document.body.innerText);
      console.log(`   Create room page: ${createText.substring(0, 1000)}`);
    } else {
      console.log('   ❌ No Create Room link');
    }

  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
}

testSimpleFinal().catch(console.error);
