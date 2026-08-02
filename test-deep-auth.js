const { chromium } = require('playwright');

async function testDeepAuth() {
  console.log('=== DEEP AUTH DEBUG ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
    if (msg.type() === 'warning') console.log(`[CONSOLE WARN] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
  });

  try {
    // Step 1: Login and capture all network
    console.log('1. Logging in...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    
    // Wait for navigation after click
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('button[type="submit"], button:has-text("Sign in")')
    ]);
    
    console.log(`   URL after login: ${page.url()}`);
    await page.waitForTimeout(3000);
    
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
    console.log('\n2. Session Info:');
    console.log(`   URL: ${sessionInfo.url}`);
    console.log(`   Cookies: ${sessionInfo.cookies}`);
    console.log(`   localStorage keys: ${Object.keys(sessionInfo.localStorage).join(', ') || 'empty'}`);
    console.log(`   Supabase keys: ${sessionInfo.sbKeys.join(', ') || 'none'}`);
    
    // Step 3: Check Supabase auth state
    const supabaseAuth = await page.evaluate(async () => {
      // Try to access supabase from window if available
      if (window.supabase) {
        const { data: { session } } = await window.supabase.auth.getSession();
        return { hasSession: !!session, user: session?.user?.email };
      }
      return { hasSession: false, reason: 'supabase not on window' };
    });
    console.log('\n3. Supabase Auth:', supabaseAuth);
    
    // Step 4: Try to access dashboard directly
    console.log('\n4. Accessing /dashboard...');
    await page.goto('https://syncsaga.vercel.app/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const dashText = await page.evaluate(() => document.body.innerText);
    console.log(`   Dashboard text (first 1000): ${dashText.substring(0, 1000)}`);
    
    // Step 5: Check if middleware is redirecting
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    if (finalUrl.includes('/auth/login')) {
      console.log('   ❌ REDIRECTED TO LOGIN - middleware thinks not authenticated');
    }
    
  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
}

testDeepAuth().catch(console.error);
