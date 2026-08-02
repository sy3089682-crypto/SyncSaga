const { chromium } = require('playwright');

async function testApiCheck() {
  console.log('=== API CHECK ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  
  const apiCalls = [];
  
  page.on('response', resp => {
    if (resp.url().includes('/api/') || resp.url().includes('supabase')) {
      apiCalls.push({ url: resp.url(), status: resp.status() });
      console.log(`[API ${resp.status()}] ${resp.url()}`);
    }
  });
  
  try {
    // Login
    console.log('1. Login...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load' });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    await page.waitForTimeout(3000);
    
    // Now try search
    console.log('\n2. Navigating to /search...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log(`Search page loaded: ${searchText.substring(0, 500)}`);
    
    // Check for API calls made
    console.log('\n--- API CALLS MADE ---');
    apiCalls.forEach(c => console.log(`  ${c.status} ${c.url}`));
    
  } catch (err) {
    console.log('Fatal:', err.message);
    console.log('\n--- API CALLS MADE (before failure) ---');
    apiCalls.forEach(c => console.log(`  ${c.status} ${c.url}`));
  }
  
  await browser.close();
}

testApiCheck().catch(console.error);
