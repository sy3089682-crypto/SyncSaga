const { chromium } = require('playwright');

async function testSupabase() {
  console.log('=== Supabase Connectivity Test ===');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  const networkCalls = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console Error: ${msg.text()}`);
    if (msg.type() === 'warning') console.log(`Warning: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`Page Error: ${err.message}`));
  page.on('response', resp => {
    networkCalls.push({ url: resp.url(), status: resp.status() });
    if (resp.status() >= 400) errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
  });

  try {
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check Supabase client init
    const supabaseInit = await page.evaluate(() => {
      // Check if supabase client exists on window
      return {
        hasSupabase: typeof window.supabase !== 'undefined',
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
      };
    });
    console.log('Supabase init:', supabaseInit);
    
    // Try direct Supabase auth call
    console.log('\n--- Testing direct Supabase auth endpoint ---');
    const authResp = await page.goto('https://xnhrhwhbltqirahbduiv.supabase.co/auth/v1/token?grant_type=password', { 
      waitUntil: 'networkidle', 
      timeout: 15000 
    });
    console.log(`Supabase auth endpoint: HTTP ${authResp.status()}`);
    
    // Check network calls for Supabase
    const sbCalls = networkCalls.filter(c => c.url.includes('supabase'));
    console.log(`\nSupabase network calls: ${sbCalls.length}`);
    sbCalls.forEach(c => console.log(`  ${c.status} ${c.url}`));
    
    // Try login with network monitoring
    console.log('\n--- Testing login with network monitoring ---');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'testpassword123');
    
    // Wait for network response after submit
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForTimeout(5000);
    
    const sbCallsAfterLogin = networkCalls.filter(c => c.url.includes('supabase') || c.url.includes('auth'));
    console.log(`Auth network calls after login: ${sbCallsAfterLogin.length}`);
    sbCallsAfterLogin.forEach(c => console.log(`  ${c.status} ${c.url}`));
    
    // Check for CORS errors
    const corsErrors = errors.filter(e => e.includes('CORS') || e.includes('cross-origin'));
    if (corsErrors.length > 0) {
      console.log('\n❌ CORS Errors:');
      corsErrors.forEach(e => console.log('  ', e));
    }
    
  } catch (err) {
    errors.push(`Fatal: ${err.message}`);
  }
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  if (errors.length === 0) {
    console.log('✅ No critical errors');
  } else {
    errors.forEach(e => console.log('❌', e));
  }
}

testSupabase().catch(console.error);
