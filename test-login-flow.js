const { chromium } = require('playwright');

async function testLoginFlow() {
  console.log('=== Login Flow Test with Pre-created User ===');
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

  const testEmail = 'playwrighttest@gmail.com';
  const testPassword = 'TestPass123!';

  try {
    // Test 1: Login page
    console.log('1. Login page...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/login-1-login.png', fullPage: true });
    console.log(`   Title: "${await page.title()}"`);
    
    // Test 2: Fill login form
    console.log('\n2. Filling login form...');
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    
    // Test 3: Submit login
    console.log('\n3. Submitting login...');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForTimeout(10000);
    
    console.log(`   URL after login: ${page.url()}`);
    const afterLogin = await page.evaluate(() => document.body.innerText);
    console.log('   Login result (first 1500):');
    console.log(afterLogin.substring(0, 1500));
    
    // Test 4: Auth state
    console.log('\n4. Auth state...');
    const authState = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
    }));
    console.log(`   Supabase keys: ${authState.supabaseKeys.join(', ') || 'none'}`);
    
    // Test 5: Protected routes
    console.log('\n5. /search...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/login-5-search.png', fullPage: true });
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log('   Search (first 2000):');
    console.log(searchText.substring(0, 2000));
    
    console.log('\n6. /discover...');
    await page.goto('https://syncsaga.vercel.app/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/login-6-discover.png', fullPage: true });
    const discoverText = await page.evaluate(() => document.body.innerText);
    console.log('   Discover (first 2000):');
    console.log(discoverText.substring(0, 2000));
    
    console.log('\n7. /settings...');
    await page.goto('https://syncsaga.vercel.app/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/login-7-settings.png', fullPage: true });
    const settingsText = await page.evaluate(() => document.body.innerText);
    console.log('   Settings (first 2000):');
    console.log(settingsText.substring(0, 2000));
    
    // Test 8: Room functionality
    console.log('\n8. Room - Join demo...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("Join")');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/login-8-room.png', fullPage: true });
    
    const roomText = await page.evaluate(() => document.body.innerText);
    console.log('   Room (first 2000):');
    console.log(roomText.substring(0, 2000));
    
    // Check video
    const videos = await page.$$eval('video', els => els.map(el => ({ src: el.src, class: el.className, duration: el.duration, currentTime: el.currentTime, readyState: el.readyState })));
    console.log(`   Videos: ${videos.length}`);
    videos.forEach(v => console.log(`     src="${v.src}" dur=${v.duration} readyState=${v.readyState}`));
    
    // Check chat
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
    console.log('✅ NO CRITICAL ERRORS - LOGIN WORKING!');
  } else {
    console.log(`❌ ${errors.length} errors:`);
    errors.forEach(e => console.log('  -', e));
  }
  if (warnings.length > 0) {
    console.log(`⚠️ ${warnings.length} warnings:`);
    warnings.forEach(w => console.log('  -', w));
  }
}

testLoginFlow().catch(console.error);
