const { chromium } = require('playwright');

async function testFinal() {
  console.log('=== Final Comprehensive Test ===');
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

  const testEmail = `testuser${Date.now()}@gmail.com`;
  const testPassword = 'TestPass123!';

  try {
    // Test 1: Home page
    console.log('1. Home page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/final-1-home.png', fullPage: true });
    console.log(`   Title: "${await page.title()}"`);
    
    // Test 2: Signup with valid email
    console.log('\n2. Signup...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/auth/register', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[placeholder="you@example.com"]', testEmail);
    await page.fill('input[placeholder="At least 8 characters"]', testPassword);
    await page.fill('input[placeholder="coolwatcher"]', `testuser${Date.now()}`);
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Sign up"), button:has-text("Register")');
    await page.waitForTimeout(8000);
    
    console.log(`   URL: ${page.url()}`);
    const signupResult = await page.evaluate(() => document.body.innerText);
    console.log('   Result (first 1500):', signupResult.substring(0, 1500));
    
    // Test 3: Login if needed
    if (page.url().includes('/auth/login')) {
      console.log('\n3. Login...');
      await page.fill('input[placeholder="you@example.com"], input[type="email"]', testEmail);
      await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', testPassword);
      await page.click('button[type="submit"], button:has-text("Sign in")');
      await page.waitForTimeout(8000);
      console.log(`   URL: ${page.url()}`);
    }
    
    // Test 4: Auth state
    console.log('\n4. Auth state...');
    const authState = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      supabaseKeys: Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
    }));
    console.log(`   Supabase keys: ${authState.supabaseKeys.join(', ') || 'none'}`);
    
    // Test 5: Protected routes
    console.log('\n5. /search...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/search', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/final-5-search.png', fullPage: true });
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log('   Search (first 2000):', searchText.substring(0, 2000));
    
    console.log('\n6. /discover...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/final-6-discover.png', fullPage: true });
    const discoverText = await page.evaluate(() => document.body.innerText);
    console.log('   Discover (first 2000):', discoverText.substring(0, 2000));
    
    console.log('\n7. /settings...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/final-7-settings.png', fullPage: true });
    const settingsText = await page.evaluate(() => document.body.innerText);
    console.log('   Settings (first 2000):', settingsText.substring(0, 2000));
    
    // Test 8: Room functionality
    console.log('\n8. Room - Join demo...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("Join")');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/final-8-room.png', fullPage: true });
    
    const roomText = await page.evaluate(() => document.body.innerText);
    console.log('   Room (first 2000):', roomText.substring(0, 2000));
    
    // Check video
    const videos = await page.$$eval('video', els => els.map(el => ({ src: el.src, class: el.className, duration: el.duration, currentTime: el.currentTime, readyState: el.readyState })));
    console.log(`   Videos: ${videos.length}`);
    videos.forEach(v => console.log(`     src="${v.src}" dur=${v.duration} readyState=${v.readyState}`));
    
    // Check for create room
    console.log('\n9. Create room flow...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    const createLink = await page.$('a:has-text("start a room"), a[href*="create"], button:has-text("start a room")');
    if (createLink) {
      console.log('   Found create room element, clicking...');
      await createLink.click();
      await page.waitForTimeout(3000);
      const createText = await page.evaluate(() => document.body.innerText);
      console.log('   Create room (first 1500):', createText.substring(0, 1500));
    } else {
      console.log('   No create room element found on home');
    }
    
  } catch (err) {
    errors.push(`Fatal: ${err.message}`);
    console.log('❌ Fatal error:', err.message);
  }
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  if (errors.length === 0) {
    console.log('✅ No critical errors');
  } else {
    console.log(`❌ ${errors.length} errors:`);
    errors.forEach(e => console.log('  -', e));
  }
  if (warnings.length > 0) {
    console.log(`⚠️ ${warnings.length} warnings:`);
    warnings.forEach(w => console.log('  -', w));
  }
}

testFinal().catch(console.error);
