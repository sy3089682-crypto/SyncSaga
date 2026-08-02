const { chromium } = require('playwright');

async function testInteractive() {
  console.log('=== Interactive Test: Join Room Flow ===');
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
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    
    // Click "Join" button
    console.log('1. Clicking "Join" button...');
    await page.click('button:has-text("Join")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/join-click.png', fullPage: true });
    console.log(`   Page title: "${await page.title()}"`);
    console.log(`   URL: ${page.url()}`);
    
    // Check what appeared
    const afterJoin = await page.evaluate(() => document.body.innerText);
    console.log('   Content after Join click (first 1500 chars):');
    console.log(afterJoin.substring(0, 1500));
    
    // Look for room list or modal
    const roomElements = await page.$$eval('[class*="room"], [class*="Room"], [id*="room"], [data-testid*="room"]', 
      els => els.map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.trim().substring(0, 100) }))
    );
    console.log(`   Room-related elements: ${roomElements.length}`);
    roomElements.forEach(r => console.log(`     <${r.tag}> ${r.class}: ${r.text}`));
    
    // Try "start a room" link
    console.log('\n2. Clicking "start a room" link...');
    await page.click('text=or start a room');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/start-room-click.png', fullPage: true });
    console.log(`   Page title: "${await page.title()}"`);
    console.log(`   URL: ${page.url()}`);
    
    const afterStart = await page.evaluate(() => document.body.innerText);
    console.log('   Content after start room click (first 1500 chars):');
    console.log(afterStart.substring(0, 1500));
    
    // Check for form inputs
    const inputs = await page.$$eval('input, select, textarea', els => 
      els.map(el => ({ type: el.type || el.tagName.toLowerCase(), name: el.name, placeholder: el.placeholder, classes: el.className }))
    );
    console.log(`   Form inputs: ${inputs.length}`);
    inputs.forEach(i => console.log(`     ${i.type}: name="${i.name}" placeholder="${i.placeholder}"`));
    
    // Check for any Supabase/auth errors in console
    console.log('\n3. Checking for auth state...');
    const authState = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
      cookies: document.cookie
    }));
    console.log(`   localStorage keys: ${authState.localStorage.join(', ') || 'none'}`);
    console.log(`   sessionStorage keys: ${authState.sessionStorage.join(', ') || 'none'}`);
    console.log(`   cookies: ${authState.cookies || 'none'}`);
    
    // Try to navigate to a specific room if URL pattern exists
    console.log('\n4. Trying direct room URL...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/room/test-room', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/direct-room.png', fullPage: true });
    console.log(`   Page title: "${await page.title()}"`);
    console.log(`   URL: ${page.url()}`);
    
    const roomContent = await page.evaluate(() => document.body.innerText);
    console.log('   Room page content (first 1500 chars):');
    console.log(roomContent.substring(0, 1500));
    
    // Check for video player or embed
    const videoElements = await page.$$eval('video, iframe[src*="youtube"], iframe[src*="embed"], [class*="player"], [class*="Player"]', 
      els => els.map(el => ({ tag: el.tagName, src: el.src || el.getAttribute('src'), class: el.className }))
    );
    console.log(`   Video/embed elements: ${videoElements.length}`);
    videoElements.forEach(v => console.log(`     <${v.tag}> src="${v.src}" class="${v.class}"`));
    
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

testInteractive().catch(console.error);
