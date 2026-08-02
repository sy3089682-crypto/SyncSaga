const { chromium } = require('playwright');

async function testApiDetailed() {
  console.log('=== DETAILED API CHECK ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  
  const apiCalls = [];
  let requestId = 0;
  
  page.on('request', req => {
    if (req.url().includes('/api/') || req.url().includes('supabase')) {
      console.log(`[REQ] ${req.method()} ${req.url()}`);
    }
  });
  
  page.on('response', resp => {
    if (resp.url().includes('/api/') || resp.url().includes('supabase')) {
      console.log(`[RESP ${resp.status()}] ${resp.url()}`);
      apiCalls.push({ url: resp.url(), status: resp.status() });
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
    if (msg.type() === 'warning') console.log(`[CONSOLE WARN] ${msg.text()}`);
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
    
    // Go to search
    console.log('\n2. Navigating to /search...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log(`\nSearch page content (first 1000):`);
    console.log(searchText.substring(0, 1000));
    
    // Try to trigger search
    console.log('\n3. Trying search input...');
    const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
    if (searchInput) {
      await searchInput.fill('One Piece');
      await page.waitForTimeout(3000);
      const filteredText = await page.evaluate(() => document.body.innerText);
      console.log(`After search "One Piece": ${filteredText.substring(0, 500)}`);
    }
    
  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
}

testApiDetailed().catch(console.error);
