const { chromium } = require('playwright');

async function testAuthFlow() {
  console.log('=== Auth Flow & Complete User Journey Test ===');
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
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('/health/ready')) {
      errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    // Test 1: Home page - demo room
    console.log('1. Home page - demo room...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/auth-1-home.png', fullPage: true });
    
    const homeText = await page.evaluate(() => document.body.innerText);
    console.log('   Content (first 2000 chars):');
    console.log(homeText.substring(0, 2000));
    
    // Check for video player in demo room
    const videos = await page.$$eval('video', els => els.map(el => ({ src: el.src, class: el.className, duration: el.duration })));
    console.log(`   Video elements: ${videos.length}`);
    videos.forEach(v => console.log(`     src="${v.src}" duration="${v.duration}" class="${v.class}"`));
    
    // Test 2: Click Join to see if it opens the demo room
    console.log('\n2. Click "Join" to enter demo room...');
    await page.click('button:has-text("Join")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/auth-2-join.png', fullPage: true });
    
    const joinText = await page.evaluate(() => document.body.innerText);
    console.log('   After Join (first 2000 chars):');
    console.log(joinText.substring(0, 2000));
    
    // Check for video player now
    const videos2 = await page.$$eval('video', els => els.map(el => ({ src: el.src, class: el.className, duration: el.duration, currentTime: el.currentTime })));
    console.log(`   Video elements: ${videos2.length}`);
    videos2.forEach(v => console.log(`     src="${v.src}" duration="${v.duration}" currentTime="${v.currentTime}"`));
    
    // Check for chat
    const chatElements = await page.$$eval('[class*="chat"], [class*="Chat"], [data-testid*="chat"]', 
      els => els.map(el => ({ class: el.className, text: el.textContent.trim().substring(0, 200) }))
    );
    console.log(`   Chat elements: ${chatElements.length}`);
    
    // Test 3: Check /search page
    console.log('\n3. /search page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/search', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/auth-3-search.png', fullPage: true });
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log('   Search content (first 2000 chars):');
    console.log(searchText.substring(0, 2000));
    
    // Test 4: Check /discover page
    console.log('\n4. /discover page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/auth-4-discover.png', fullPage: true });
    
    const discoverText = await page.evaluate(() => document.body.innerText);
    console.log('   Discover content (first 2000 chars):');
    console.log(discoverText.substring(0, 2000));
    
    // Test 5: Check /settings page (should redirect to login)
    console.log('\n5. /settings page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/auth-5-settings.png', fullPage: true });
    console.log(`   URL after redirect: ${page.url()}`);
    
    const settingsText = await page.evaluate(() => document.body.innerText);
    console.log('   Settings content (first 2000 chars):');
    console.log(settingsText.substring(0, 2000));
    
    // Test 6: Try login with email (should fail without Supabase)
    console.log('\n6. Testing login form...');
    if (page.url().includes('/auth/login')) {
      await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
      await page.fill('input[name="password"], input[type="password"]', 'testpassword123');
      await page.click('button[type="submit"], button:has-text("Sign in")');
      await page.waitForTimeout(3000);
      console.log(`   After login attempt: ${page.url()}`);
      const loginResult = await page.evaluate(() => document.body.innerText);
      console.log('   Login result (first 1000 chars):');
      console.log(loginResult.substring(0, 1000));
    }
    
    // Test 7: Check for Supabase auth state
    console.log('\n7. Checking auth state...');
    const authState = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      cookies: document.cookie,
      supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
    }));
    console.log(`   localStorage: ${authState.localStorage.join(', ') || 'empty'}`);
    console.log(`   sessionStorage: ${authState.sessionStorage.join(', ') || 'empty'}`);
    console.log(`   Supabase keys: ${authState.supabaseKeys.join(', ') || 'none'}`);
    console.log(`   Cookies: ${authState.cookies || 'none'}`);
    
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

testAuthFlow().catch(console.error);
