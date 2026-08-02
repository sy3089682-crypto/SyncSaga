const { chromium } = require('playwright');

async function testDeepAuth() {
  console.log('=== DEEP AUTH DEBUG v2 ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
    if (msg.type() === 'warning') console.log(`[CONSOLE WARN] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
  });

  try {
    // Step 1: Login with longer timeout
    console.log('1. Loading login page...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load', timeout: 60000 });
    console.log('   Login page loaded');
    
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    
    // Click and wait for navigation
    console.log('2. Submitting login...');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**', { timeout: 60000 });
    console.log(`   URL after login: ${page.url()}`);
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    // Step 2: Check session in detail
    const sessionInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        cookies: document.cookie,
        localStorage: {...localStorage},
        sessionStorage: {...sessionStorage},
        sbKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
      };
    });
    console.log('\n3. Session Info:');
    console.log(`   URL: ${sessionInfo.url}`);
    console.log(`   Cookies: ${sessionInfo.cookies}`);
    console.log(`   localStorage keys: ${Object.keys(sessionInfo.localStorage).join(', ') || 'empty'}`);
    console.log(`   Supabase keys: ${sessionInfo.sbKeys.join(', ') || 'none'}`);
    
    // Step 3: Try to access search
    console.log('\n4. Accessing /search...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log(`   Search page text (first 1000): ${searchText.substring(0, 1000)}`);
    
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    if (finalUrl.includes('/auth/login')) {
      console.log('   ❌ REDIRECTED TO LOGIN');
    }
    
  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
}

testDeepAuth().catch(console.error);
