const { chromium } = require('playwright');

async function testRoomFlow() {
  console.log('=== Room Flow & Direct Navigation Test ===');
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
    // Test 1: Direct room URL
    console.log('1. Testing direct room URL...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/room/test-room-123', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/direct-room-test.png', fullPage: true });
    console.log(`   Title: "${await page.title()}"`);
    console.log(`   URL: ${page.url()}`);
    
    const roomText = await page.evaluate(() => document.body.innerText);
    console.log('   Content (first 2000 chars):');
    console.log(roomText.substring(0, 2000));
    
    // Check for video/embed
    const videos = await page.$$eval('video, iframe', els => els.map(el => ({ tag: el.tagName, src: el.src, class: el.className })));
    console.log(`   Video/iframe elements: ${videos.length}`);
    videos.forEach(v => console.log(`     <${v.tag}> src="${v.src || 'none'}" class="${v.class}"`));
    
    // Test 2: Embed page
    console.log('\n2. Testing embed page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/embed/room/test-room-123', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/embed-room-test.png', fullPage: true });
    console.log(`   Title: "${await page.title()}"`);
    console.log(`   URL: ${page.url()}`);
    
    const embedText = await page.evaluate(() => document.body.innerText);
    console.log('   Content (first 2000 chars):');
    console.log(embedText.substring(0, 2000));
    
    // Test 3: Back to home, click Join to see room list
    console.log('\n3. Back to home - clicking Join to see room list...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("Join")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/after-join.png', fullPage: true });
    
    const afterJoin = await page.evaluate(() => document.body.innerText);
    console.log('   After Join click (first 2000 chars):');
    console.log(afterJoin.substring(0, 2000));
    
    // Check for room list items
    const roomItems = await page.$$eval('[class*="room"], [class*="Room"], li, [role="listitem"]', 
      els => els.map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.trim().substring(0, 200) }))
    );
    console.log(`\n   Potential room items: ${roomItems.length}`);
    roomItems.forEach(r => console.log(`     <${r.tag}> ${r.class}: ${r.text}`));
    
    // Test 4: Find the "start a room" link/button
    console.log('\n4. Finding "start a room" element...');
    const startElements = await page.$$eval('a, button', els => 
      els.filter(el => el.textContent.toLowerCase().includes('start') && el.textContent.toLowerCase().includes('room'))
      .map(el => ({ tag: el.tagName, text: el.textContent.trim(), class: el.className, href: el.href }))
    );
    console.log(`   "start a room" elements: ${startElements.length}`);
    startElements.forEach(s => console.log(`     <${s.tag}> ${s.text} -> ${s.href || 'button'}`));
    
    if (startElements.length > 0) {
      // Try clicking the first one with a more robust selector
      try {
        console.log('   Clicking first "start a room" element...');
        await page.click(startElements[0].tag === 'A' ? `a:has-text("${startElements[0].text}")` : `button:has-text("${startElements[0].text}")`);
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/tmp/after-start-room.png', fullPage: true });
        console.log(`   Title: "${await page.title()}"`);
        console.log(`   URL: ${page.url()}`);
      } catch (e) {
        console.log(`   Click failed: ${e.message}`);
      }
    }
    
    // Test 5: Check for any anime/search/discover pages
    console.log('\n5. Testing other routes...');
    const routes = ['/anime', '/search', '/discover', '/browse', '/settings', '/friends'];
    for (const route of routes) {
      try {
        const resp = await page.goto(`https://syncsaga-sy3089682-gmailcoms-projects.vercel.app${route}`, { waitUntil: 'networkidle', timeout: 15000 });
        console.log(`   ${route}: HTTP ${resp.status()} - "${await page.title()}"`);
        if (resp.status() === 200) {
          await page.screenshot({ path: `/tmp/route-${route.replace('/', '')}.png`, fullPage: true });
        }
      } catch (e) {
        console.log(`   ${route}: Error - ${e.message}`);
      }
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
    errors.forEach(e => console.log('❌', e));
  }
  if (warnings.length > 0) {
    warnings.forEach(w => console.log('⚠️', w));
  }
}

testRoomFlow().catch(console.error);
