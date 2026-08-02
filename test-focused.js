const { chromium } = require('playwright');

async function testFocused() {
  console.log('=== FOCUSED FEATURE TEST ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('/health/ready')) {
      console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  try {
    // Login
    console.log('1. Login...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load' });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    console.log('   ✅ Login successful');

    // Dashboard
    console.log('\n2. Dashboard...');
    await page.waitForTimeout(3000);
    const dashText = await page.evaluate(() => document.body.innerText);
    console.log(`   Content: ${dashText.substring(0, 300)}`);
    const noDemo = dashText.includes('No rooms yet') || dashText.includes('Create your first');
    console.log(`   No demo rooms: ${noDemo ? '✅ YES' : '❌ NO'}`);

    // Search page
    console.log('\n3. Search page...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const searchText = await page.evaluate(() => document.body.innerText);
    const animeCount = (searchText.match(/Create Room/g) || []).length;
    console.log(`   Anime listings: ${animeCount}`);
    console.log(`   Has search input: ${searchText.includes('Search') ? '✅' : '❌'}`);
    console.log(`   First 500 chars: ${searchText.substring(0, 500)}`);

    // Create room flow
    console.log('\n4. Create room...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const createLink = await page.$('a:has-text("Create Room"), a:has-text("start a room"), a[href*="create"], button:has-text("Create Room")');
    if (createLink) {
      await createLink.click();
      await page.waitForURL('**/room/create**', { timeout: 10000 });
      await page.waitForTimeout(3000);
      const createText = await page.evaluate(() => document.body.innerText);
      console.log(`   Create room page: ${createText.substring(0, 400)}`);
      
      // Try anime search
      const animeSearch = await page.$('input[placeholder*="anime" i], input[placeholder*="search" i], input[placeholder*="Select" i]');
      if (animeSearch) {
        await animeSearch.fill('One Piece');
        await page.waitForTimeout(2000);
        console.log('   ✅ Anime search input works');
      }
    } else {
      console.log('   ❌ No create room link');
    }

    // Join demo room
    console.log('\n5. Join demo room...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    const joinBtn = await page.$('button:has-text("Join")');
    if (joinBtn) {
      await joinBtn.click();
      await page.waitForTimeout(5000);
      const roomText = await page.evaluate(() => document.body.innerText);
      console.log(`   Room content: ${roomText.substring(0, 400)}`);
      
      const videos = await page.$$eval('video', els => els.length);
      console.log(`   Video elements: ${videos}`);
      
      const chat = await page.$$eval('[class*="chat" i], [class*="Chat" i], [data-testid*="chat" i]', els => els.length);
      console.log(`   Chat elements: ${chat}`);
    } else {
      console.log('   ❌ No Join button');
    }

  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
}

testFocused().catch(console.error);
