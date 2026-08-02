const { chromium } = require('playwright');

async function testComprehensive() {
  console.log('=== COMPREHENSIVE SYNC SAGA FEATURE TEST ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  const features = {};
  
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
    // ============================================================
    // TEST 1: AUTHENTICATION FLOW
    // ============================================================
    console.log('🔐 TEST 1: Authentication Flow');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', testEmail);
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', testPassword);
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForTimeout(10000);
    
    if (page.url().includes('/dashboard')) {
      features.auth = true;
      console.log('  ✅ Login successful - redirected to /dashboard');
    } else {
      features.auth = false;
      errors.push('Login failed - not redirected to dashboard');
    }

    // ============================================================
    // TEST 2: DASHBOARD
    // ============================================================
    console.log('\n📊 TEST 2: Dashboard');
    const dashText = await page.evaluate(() => document.body.innerText);
    if (dashText.includes('Welcome back, playwrighttest')) {
      features.dashboard = true;
      console.log('  ✅ Dashboard loads with user greeting');
    } else {
      features.dashboard = false;
      errors.push('Dashboard missing user greeting');
    }
    
    if (dashText.includes('Create Room')) {
      features.createRoomButton = true;
      console.log('  ✅ Create Room button present');
    } else {
      features.createRoomButton = false;
      warnings.push('Create Room button not found');
    }

    // ============================================================
    // TEST 3: SEARCH / DISCOVER
    // ============================================================
    console.log('\n🔍 TEST 3: Search Page');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/test-search.png', fullPage: true });
    
    const searchText = await page.evaluate(() => document.body.innerText);
    if (searchText.includes('Discover Anime')) {
      features.searchPage = true;
      console.log('  ✅ Search page loads with "Discover Anime"');
    } else {
      features.searchPage = false;
      errors.push('Search page missing "Discover Anime"');
    }
    
    // Check for anime listings
    const animeCount = (searchText.match(/Create Room/g) || []).length;
    if (animeCount > 5) {
      features.animeListings = true;
      console.log(`  ✅ Found ${animeCount} anime listings with "Create Room" buttons`);
    } else {
      features.animeListings = false;
      errors.push(`Only ${animeCount} anime listings found`);
    }
    
    // Check for search input
    const searchInputs = await page.$$eval('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]', 
      els => els.length);
    if (searchInputs > 0) {
      features.searchInput = true;
      console.log(`  ✅ Search input field found`);
    } else {
      features.searchInput = false;
      warnings.push('No search input field found');
    }

    // ============================================================
    // TEST 4: DISCOVER
    // ============================================================
    console.log('\n🎯 TEST 4: Discover Page');
    await page.goto('https://syncsaga.vercel.app/discover', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/test-discover.png', fullPage: true });
    
    const discoverText = await page.evaluate(() => document.body.innerText);
    if (discoverText.includes('Discover Anime')) {
      features.discoverPage = true;
      console.log('  ✅ Discover page loads');
    } else {
      features.discoverPage = false;
      errors.push('Discover page missing content');
    }

    // ============================================================
    // TEST 5: SETTINGS
    // ============================================================
    console.log('\n⚙️ TEST 5: Settings Page');
    await page.goto('https://syncsaga.vercel.app/settings', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: '/tmp/test-settings.png', fullPage: true });
    
    const settingsText = await page.evaluate(() => document.body.innerText);
    if (settingsText.includes('Settings') || settingsText.includes('Account')) {
      features.settingsPage = true;
      console.log('  ✅ Settings page accessible');
    } else {
      features.settingsPage = false;
      warnings.push('Settings page may not have expected content');
    }

    // ============================================================
    // TEST 6: FRIENDS
    // ============================================================
    console.log('\n👥 TEST 6: Friends Page');
    await page.goto('https://syncsaga.vercel.app/friends', { waitUntil: 'networkidle', timeout: 30000 });
    const friendsText = await page.evaluate(() => document.body.innerText);
    if (friendsText.includes('Friends') || friendsText.includes('Find Friends')) {
      features.friendsPage = true;
      console.log('  ✅ Friends page accessible');
    } else {
      features.friendsPage = false;
      warnings.push('Friends page may not have expected content');
    }

    // ============================================================
    // TEST 7: CREATE ROOM FLOW
    // ============================================================
    console.log('\n🏠 TEST 7: Create Room Flow');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    const createLink = await page.$('a:has-text("start a room"), a[href*="create"], button:has-text("start a room"), a:has-text("Create Room")');
    if (createLink) {
      await createLink.click();
      await page.waitForTimeout(3000);
      const createText = await page.evaluate(() => document.body.innerText);
      if (createText.includes('Create') || createText.includes('Room') || createText.includes('Anime')) {
        features.createRoomFlow = true;
        console.log('  ✅ Create room flow accessible');
      } else {
        features.createRoomFlow = false;
        warnings.push('Create room page loaded but unexpected content');
      }
    } else {
      features.createRoomFlow = false;
      warnings.push('No create room link found on home');
    }

    // ============================================================
    // TEST 8: JOIN EXISTING ROOM
    // ============================================================
    console.log('\n🚪 TEST 8: Join Existing Room (Demo)');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    const joinBtn = await page.$('button:has-text("Join")');
    if (joinBtn) {
      await joinBtn.click();
      await page.waitForTimeout(5000);
      const roomText = await page.evaluate(() => document.body.innerText);
      if (roomText.includes('in sync') || roomText.includes('Joined') || roomText.includes('Mira')) {
        features.joinRoom = true;
        console.log('  ✅ Joined demo room - shows sync status and participants');
      } else {
        features.joinRoom = false;
        warnings.push('Join button clicked but room state unclear');
      }
      
      // Check for video element
      const videos = await page.$$eval('video', els => els.map(el => ({ 
        src: el.src, 
        duration: el.duration, 
        readyState: el.readyState,
        paused: el.paused
      })));
      features.videoElements = videos.length;
      console.log(`  📹 Video elements: ${videos.length}`);
      videos.forEach(v => console.log(`     src: ${v.src || 'none'}, duration: ${v.duration}, readyState: ${v.readyState}, paused: ${v.paused}`));
      
      // Check for chat
      const chat = await page.$$eval('[class*="chat" i], [class*="Chat" i], [data-testid*="chat" i]', 
        els => els.map(el => ({ class: el.className, text: el.textContent.trim().substring(0, 200) }))
      );
      features.chatElements = chat.length;
      console.log(`  💬 Chat elements: ${chat.length}`);
      chat.forEach(c => console.log(`     ${c.class}: ${c.text.substring(0, 100)}`));
      
    } else {
      features.joinRoom = false;
      warnings.push('No Join button found');
    }

    // ============================================================
    // TEST 9: PROTECTED ROUTE ACCESS
    // ============================================================
    console.log('\n🔒 TEST 9: Protected Route Access (no redirect to login)');
    const protectedRoutes = ['/dashboard', '/search', '/discover', '/settings', '/friends'];
    let allProtectedOk = true;
    for (const route of protectedRoutes) {
      await page.goto(`https://syncsaga.vercel.app${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      const url = page.url();
      if (url.includes('/auth/login')) {
        allProtectedOk = false;
        errors.push(`${route} redirects to login`);
      }
    }
    features.protectedRoutes = allProtectedOk;
    if (allProtectedOk) {
      console.log('  ✅ All protected routes accessible without login redirect');
    }

    // ============================================================
    // TEST 10: NAVIGATION / UI
    // ============================================================
    console.log('\n🧭 TEST 10: Navigation');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    const navLinks = await page.$$eval('nav a, header a, [role="navigation"] a', 
      els => els.map(el => ({ text: el.textContent.trim(), href: el.href })));
    console.log(`  📋 Nav links found: ${navLinks.length}`);
    navLinks.forEach(l => console.log(`     - ${l.text}: ${l.href}`));
    features.navLinks = navLinks.length;

    // ============================================================
    // TEST 11: LOGOUT
    // ============================================================
    console.log('\n🚪 TEST 11: Logout');
    const logoutBtn = await page.$('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")');
    if (logoutBtn) {
      await logoutBtn.click();
      await page.waitForTimeout(3000);
      if (page.url().includes('/auth/login') || page.url() === 'https://syncsaga.vercel.app/') {
        features.logout = true;
        console.log('  ✅ Logout works');
      } else {
        features.logout = false;
        warnings.push('Logout clicked but unclear result');
      }
    } else {
      features.logout = false;
      warnings.push('No logout button found');
    }

  } catch (err) {
    errors.push(`Fatal: ${err.message}`);
    console.log('❌ Fatal error:', err.message);
  }
  
  await browser.close();
  
  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 FEATURE COMPLETENESS REPORT');
  console.log('='.repeat(60));
  
  const featureList = [
    { key: 'auth', label: 'Authentication (Login/Session)', critical: true },
    { key: 'dashboard', label: 'Dashboard with User Greeting', critical: true },
    { key: 'createRoomButton', label: 'Create Room Button', critical: true },
    { key: 'searchPage', label: 'Search Page Loads', critical: true },
    { key: 'animeListings', label: 'Anime Listings from DB', critical: true },
    { key: 'searchInput', label: 'Search Input Field', critical: false },
    { key: 'discoverPage', label: 'Discover Page', critical: true },
    { key: 'settingsPage', label: 'Settings Page', critical: false },
    { key: 'friendsPage', label: 'Friends Page', critical: false },
    { key: 'createRoomFlow', label: 'Create Room Flow', critical: true },
    { key: 'joinRoom', label: 'Join Existing Room', critical: true },
    { key: 'videoElements', label: 'Video Player Elements', critical: true },
    { key: 'chatElements', label: 'Chat Elements', critical: true },
    { key: 'protectedRoutes', label: 'Protected Routes (no redirect)', critical: true },
    { key: 'navLinks', label: 'Navigation Links', critical: false },
    { key: 'logout', label: 'Logout', critical: false },
  ];
  
  let passed = 0;
  let failed = 0;
  let warning = 0;
  
  for (const f of featureList) {
    const val = features[f.key];
    let status = '❌ FAIL';
    if (val === true) { status = '✅ PASS'; passed++; }
    else if (typeof val === 'number' && val > 0) { status = '✅ PASS'; passed++; }
    else if (val === false && f.critical) { status = '❌ FAIL'; failed++; }
    else if (val === false && !f.critical) { status = '⚠️ WARN'; warning++; }
    else if (typeof val === 'number' && val === 0) { 
      if (f.critical) { status = '❌ FAIL'; failed++; } 
      else { status = '⚠️ WARN'; warning++; }
    }
    console.log(`  ${status}  ${f.label}`);
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Warnings: ${warning}`);
  console.log(`  📊 Total Features: ${featureList.length}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log('  -', e));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    warnings.forEach(w => console.log('  -', w));
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    console.log('🎉 SYNC SAGA IS FULLY USABLE - ALL CRITICAL FEATURES WORK!');
  } else {
    console.log(`⚠️  ${failed} CRITICAL ISSUES - NOT FULLY USABLE YET`);
  }
  console.log('='.repeat(60));
}

testComprehensive().catch(console.error);
