const { chromium } = require('playwright');

async function testSimple() {
  console.log('=== SIMPLE TEST - Check Login & Session ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`Console Error: ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`Page Error: ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) console.log(`HTTP ${resp.status()}: ${resp.url()}`);
  });

  try {
    // Test 1: Login
    console.log('1. Login...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForTimeout(8000);
    
    console.log(`   URL: ${page.url()}`);
    
    // Check for dashboard
    const dashText = await page.evaluate(() => document.body.innerText);
    console.log(`   Page text (first 500): ${dashText.substring(0, 500)}`);
    
    // Test 2: Check cookies/localStorage
    console.log('\n2. Auth state...');
    const authState = await page.evaluate(() => ({
      cookies: document.cookie,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
    }));
    console.log(`   Cookies: ${authState.cookies || 'none'}`);
    console.log(`   localStorage: ${authState.localStorage.join(', ') || 'empty'}`);
    console.log(`   Supabase keys: ${authState.supabaseKeys.join(', ') || 'none'}`);
    
    // Test 3: Go to search with longer timeout
    console.log('\n3. Navigate to /search...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log(`   URL: ${page.url()}`);
    console.log(`   Page text (first 1000): ${searchText.substring(0, 1000)}`);
    
  } catch (err) {
    errors.push(`Fatal: ${err.message}`);
    console.log('❌ Fatal error:', err.message);
  }
  
  await browser.close();
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log('  -', e));
  }
}

testSimple().catch(console.error);
