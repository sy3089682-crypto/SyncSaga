const { chromium } = require('playwright');

async function testSignupFlow() {
  console.log('=== Signup & Real User Journey ===');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console Error: ${msg.text()}`);
    if (msg.type() === 'warning') warnings.push(`Console Warning: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`Page Error: ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('/health/ready')) {
      errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  try {
    // Test 1: Home page
    console.log('1. Home page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/signup-1-home.png', fullPage: true });
    console.log(`   Title: "${await page.title()}"`);
    
    // Test 2: Go to signup
    console.log('\n2. Navigate to signup...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/auth/register', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/signup-2-register.png', fullPage: true });
    
    const registerText = await page.evaluate(() => document.body.innerText);
    console.log('   Register page (first 1500 chars):');
    console.log(registerText.substring(0, 1500));
    
    // Test 3: Fill signup form
    console.log('\n3. Filling signup form...');
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[name="confirmPassword"], input[name="confirm"]', testPassword);
    
    // Check for OAuth buttons
    const oauthButtons = await page.$$eval('button, a', els => 
      els.filter(el => {
        const t = el.textContent.toLowerCase();
        return t.includes('google') || t.includes('github') || t.includes('discord');
      }).map(el => el.textContent.trim())
    );
    console.log(`   OAuth buttons: ${oauthButtons.join(', ') || 'none'}`);
    
    // Test 4: Submit signup
    console.log('\n4. Submitting signup...');
    await page.click('button[type="submit"], button:has-text("Sign up"), button:has-text("Create"), button:has-text("Register")');
    await page.waitForTimeout(5000);
    
    const afterSignup = await page.evaluate(() => document.body.innerText);
    console.log(`   URL after signup: ${page.url()}`);
    console.log('   Result (first 1500 chars):');
    console.log(afterSignup.substring(0, 1500));
    
    // Test 5: If redirected to login, try login
    if (page.url().includes('/auth/login')) {
      console.log('\n5. Redirected to login - trying login...');
      await page.fill('input[name="email"], input[type="email"]', testEmail);
      await page.fill('input[name="password"], input[type="password"]', testPassword);
      await page.click('button[type="submit"], button:has-text("Sign in")');
      await page.waitForTimeout(5000);
      
      console.log(`   URL after login: ${page.url()}`);
      const afterLogin = await page.evaluate(() => document.body.innerText);
      console.log('   Login result (first 1500 chars):');
      console.log(afterLogin.substring(0, 1500));
    }
    
    // Test 6: Check authenticated state
    console.log('\n6. Checking auth state...');
    const authState = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
    }));
    console.log(`   localStorage: ${authState.localStorage.join(', ') || 'empty'}`);
    console.log(`   Supabase keys: ${authState.supabaseKeys.join(', ') || 'none'}`);
    
    // Test 7: Access protected route
    console.log('\n7. Accessing /search (protected)...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/search', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/signup-7-search.png', fullPage: true });
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log('   Search page (first 2000 chars):');
    console.log(searchText.substring(0, 2000));
    
    // Check for video player
    const videos = await page.$$eval('video', els => els.map(el => ({ src: el.src, class: el.className })));
    console.log(`   Video elements: ${videos.length}`);
    
  } catch (err) {
    errors.push(`Fatal: ${err.message}`);
    console.log('❌ Fatal error:', err.message);
  }
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  if (errors.length === 0) {
    console.log('✅ No critical errors');
  } else {
    errors.forEach(e => console.log('❌', e));
  }
  if (warnings.length > 0) {
    warnings.forEach(w => console.log('⚠️', w));
  }
}

testSignupFlow().catch(console.error);
