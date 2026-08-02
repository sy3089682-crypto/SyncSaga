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
    // Test 1: Go to signup
    console.log('1. Navigate to signup...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/auth/register', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/signup-1-register.png', fullPage: true });
    
    // Fill using placeholder selectors
    console.log('\n2. Filling signup form...');
    await page.fill('input[placeholder="you@example.com"]', testEmail);
    await page.fill('input[placeholder="At least 8 characters"]', testPassword);
    await page.fill('input[placeholder="coolwatcher"]', `testuser${Date.now()}`);
    
    // Test 2: Submit signup
    console.log('\n3. Submitting signup...');
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Sign up"), button:has-text("Register")');
    await page.waitForTimeout(8000);
    
    console.log(`   URL after signup: ${page.url()}`);
    const afterSignup = await page.evaluate(() => document.body.innerText);
    console.log('   Result (first 1500 chars):');
    console.log(afterSignup.substring(0, 1500));
    
    // Test 3: If redirected to login, try login
    if (page.url().includes('/auth/login')) {
      console.log('\n4. Redirected to login - trying login...');
      await page.fill('input[placeholder="you@example.com"], input[type="email"]', testEmail);
      await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', testPassword);
      await page.click('button[type="submit"], button:has-text("Sign in")');
      await page.waitForTimeout(8000);
      
      console.log(`   URL after login: ${page.url()}`);
      const afterLogin = await page.evaluate(() => document.body.innerText);
      console.log('   Login result (first 1500 chars):');
      console.log(afterLogin.substring(0, 1500));
    }
    
    // Test 4: Check authenticated state
    console.log('\n5. Checking auth state...');
    const authState = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
    }));
    console.log(`   localStorage: ${authState.localStorage.join(', ') || 'empty'}`);
    console.log(`   Supabase keys: ${authState.supabaseKeys.join(', ') || 'none'}`);
    
    // Test 5: Access protected route
    console.log('\n6. Accessing /search (protected)...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/search', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/signup-6-search.png', fullPage: true });
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log('   Search page (first 2000 chars):');
    console.log(searchText.substring(0, 2000));
    
    // Test 6: Access /discover
    console.log('\n7. Accessing /discover...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/signup-7-discover.png', fullPage: true });
    
    const discoverText = await page.evaluate(() => document.body.innerText);
    console.log('   Discover page (first 2000 chars):');
    console.log(discoverText.substring(0, 2000));
    
    // Test 7: Try joining demo room
    console.log('\n8. Trying to join demo room...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("Join")');
    await page.waitForTimeout(5000);
    
    const afterJoin = await page.evaluate(() => document.body.innerText);
    console.log('   After Join (first 2000 chars):');
    console.log(afterJoin.substring(0, 2000));
    
    // Check for video
    const videos = await page.$$eval('video', els => els.map(el => ({ src: el.src, class: el.className, duration: el.duration, currentTime: el.currentTime })));
    console.log(`   Video elements: ${videos.length}`);
    videos.forEach(v => console.log(`     src="${v.src}" duration="${v.duration}" currentTime="${v.currentTime}"`));
    
    // Check for chat
    const chat = await page.$$eval('[class*="chat" i], [class*="Chat" i], [data-testid*="chat" i]', 
      els => els.map(el => ({ class: el.className, text: el.textContent.trim().substring(0, 200) }))
    );
    console.log(`   Chat elements: ${chat.length}`);
    chat.forEach(c => console.log(`     ${c.class}: ${c.text}`));
    
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
