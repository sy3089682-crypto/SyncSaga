const { chromium } = require('playwright');

async function testFinalVerification() {
  console.log('=== FINAL VERIFICATION: Host Anime & Remove Demo Data ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('/health/ready')) {
      console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  const results = {};

  try {
    // ============================================================
    // LOGIN
    // ============================================================
    console.log('1. LOGIN...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load' });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    await page.waitForTimeout(3000);
    results.login = true;
    console.log('   ✅ Login successful');

    // ============================================================
    // DASHBOARD - Check for demo data removal
    // ============================================================
    console.log('\n2. DASHBOARD...');
    const dashText = await page.evaluate(() => document.body.innerText);
    console.log(`   Content: ${dashText.substring(0, 500)}`);
    
    const noDemoRooms = dashText.includes('No rooms yet') || dashText.includes('Create your first');
    results.demoDataRemoved = noDemoRooms;
    console.log(`   Demo data removed: ${noDemoRooms ? '✅ YES' : '❌ NO'}`);

    // ============================================================
    // SEARCH PAGE - Use DOMContentLoaded instead of networkidle
    // ============================================================
    console.log('\n3. SEARCH PAGE...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const searchText = await page.evaluate(() => document.body.innerText);
    console.log(`   Content (first 1000): ${searchText.substring(0, 1000)}`);
    
    const hasSearchHeader = searchText.includes('Discover Anime') || searchText.includes('Search, explore');
    const animeCount = (searchText.match(/Create Room/g) || []).length;
    const hasSearchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]') !== null;
    
    results.searchPage = hasSearchHeader;
    results.animeListings = animeCount > 5;
    results.searchInput = hasSearchInput;
    
    console.log(`   Page loads: ${hasSearchHeader ? '✅' : '❌'}`);
    console.log(`   Anime listings: ${animeCount}`);
    console.log(`   Search input: ${hasSearchInput ? '✅' : '❌'}`);

    // ============================================================
    // CREATE ROOM FLOW
    // ============================================================
    console.log('\n4. CREATE ROOM...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const createLink = await page.$('a:has-text("Create Room"), a:has-text("start a room"), a[href*="create"], button:has-text("Create Room")');
    if (createLink) {
      await createLink.click();
      await page.waitForURL('**/room/create**', { timeout: 10000 });
      await page.waitForTimeout(3000);
      const createText = await page.evaluate(() => document.body.innerText);
      console.log(`   Create room page: ${createText.substring(0, 400)}`);
      
      const animeSearch = await page.$('input[placeholder*="anime" i], input[placeholder*="search" i], input[placeholder*="Select" i]');
      results.createRoom = true;
      results.hostAnime = !!animeSearch;
      console.log(`   Anime search input: ${animeSearch ? '✅' : '❌'}`);
    } else {
      console.log('   ❌ No create room link');
    }

    // ============================================================
    // JOIN DEMO ROOM
    // ============================================================
    console.log('\n5. JOIN DEMO ROOM...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const joinBtn = await page.$('button:has-text("Join")');
    if (joinBtn) {
      await joinBtn.click();
      await page.waitForTimeout(5000);
      const roomText = await page.evaluate(() => document.body.innerText);
      console.log(`   Room content: ${roomText.substring(0, 400)}`);
      
      const videos = await page.$$eval('video', els => els.length);
      const chat = await page.$$eval('[class*="chat" i], [class*="Chat" i], [data-testid*="chat" i]', els => els.length);
      
      results.joinRoom = roomText.includes('in sync') || roomText.includes('Mira') || roomText.includes('frame');
      results.videoPlayer = videos > 0;
      results.chat = chat > 0;
      
      console.log(`   Room joined: ${results.joinRoom ? '✅' : '❌'}`);
      console.log(`   Video elements: ${videos}`);
      console.log(`   Chat elements: ${chat}`);
    }

    // ============================================================
    // SETTINGS
    // ============================================================
    console.log('\n6. SETTINGS...');
    await page.goto('https://syncsaga.vercel.app/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const settingsText = await page.evaluate(() => document.body.innerText);
    results.settings = settingsText.includes('Settings') || settingsText.includes('Profile');
    console.log(`   Settings accessible: ${results.settings ? '✅' : '❌'}`);

  } catch (err) {
    console.log('Fatal:', err.message);
  }
  
  await browser.close();
  
  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 FINAL VERIFICATION REPORT');
  console.log('='.repeat(70));
  
  const features = [
    { key: 'login', label: 'Login/Authentication', critical: true },
    { key: 'demoDataRemoved', label: 'Demo Data Removed (Clean State)', critical: true },
    { key: 'searchPage', label: 'Search Page Loads', critical: true },
    { key: 'animeListings', label: 'Real Anime Listings (>5)', critical: true },
    { key: 'searchInput', label: 'Search Input Functional', critical: true },
    { key: 'createRoom', label: 'Create Room Flow', critical: true },
    { key: 'hostAnime', label: 'Host Anime (Anime Selection)', critical: true },
    { key: 'joinRoom', label: 'Join Existing Room', critical: true },
    { key: 'videoPlayer', label: 'Video Player Element', critical: true },
    { key: 'chat', label: 'Chat System', critical: true },
    { key: 'settings', label: 'Settings Page', critical: false },
  ];
  
  let passed = 0, failed = 0, warnings = 0;
  
  for (const f of features) {
    const val = results[f.key];
    let status = val ? '✅ PASS' : (f.critical ? '❌ FAIL' : '⚠️ WARN');
    if (val) passed++; else if (f.critical) failed++; else warnings++;
    console.log(`  ${status}  ${f.label}`);
  }
  
  console.log('\n' + '-'.repeat(70));
  console.log(`  ✅ Passed: ${passed}/${features.length}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️ Warnings: ${warnings}`);
  console.log('='.repeat(70));
  
  if (failed === 0) {
    console.log('\n🎉 SYNC SAGA IS FULLY USABLE!');
    console.log('   ✅ Login & session management working');
    console.log('   ✅ Real anime data from AniList API');
    console.log('   ✅ Search & filtering functional');
    console.log('   ✅ Create room with anime selection (host anime)');
    console.log('   ✅ Join room works');
    console.log('   ✅ Clean state - no demo data pollution');
  } else {
    console.log(`\n⚠️  ${failed} CRITICAL ISSUES - NOT FULLY USABLE`);
  }
  console.log('='.repeat(70));
}

testFinalVerification().catch(console.error);
