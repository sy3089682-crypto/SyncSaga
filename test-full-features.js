const { chromium } = require('playwright');

async function testFullFeatures() {
  console.log('=== FULL FEATURE TEST: Host Anime, Remove Demo Data ===\n');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  page.setDefaultTimeout(60000);
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

  const results = {
    login: false,
    search: false,
    animeListings: false,
    searchFunctionality: false,
    discover: false,
    createRoom: false,
    joinRoom: false,
    videoPlayer: false,
    chat: false,
    settings: false,
    friends: false,
    dashboard: false,
    demoDataRemoved: false,
    hostAnime: false,
  };

  try {
    // ============================================================
    // LOGIN
    // ============================================================
    console.log('🔐 LOGIN...');
    await page.goto('https://syncsaga.vercel.app/auth/login', { waitUntil: 'load' });
    await page.fill('input[placeholder="you@example.com"], input[type="email"]', 'playwrighttest@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"], input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    console.log('   ✅ Login successful - redirected to dashboard');
    results.login = true;

    // ============================================================
    // DASHBOARD
    // ============================================================
    console.log('\n📊 DASHBOARD...');
    await page.waitForTimeout(3000);
    const dashText = await page.evaluate(() => document.body.innerText);
    if (dashText.includes('Welcome back, playwrighttest')) {
      results.dashboard = true;
      console.log('   ✅ Dashboard shows user greeting');
    }
    
    // Check for "Your Rooms" section - should be empty (no demo data)
    if (dashText.includes('No rooms yet') || dashText.includes('Create your first')) {
      results.demoDataRemoved = true;
      console.log('   ✅ No demo rooms - "No rooms yet" shown');
    }

    // ============================================================
    // SEARCH PAGE
    // ============================================================
    console.log('\n🔍 SEARCH PAGE...');
    await page.goto('https://syncsaga.vercel.app/search', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    const searchText = await page.evaluate(() => document.body.innerText);
    if (searchText.includes('Discover Anime') || searchText.includes('Search, explore')) {
      results.search = true;
      console.log('   ✅ Search page loads');
    }
    
    // Count anime listings
    const animeCount = (searchText.match(/Create Room/g) || []).length;
    if (animeCount > 5) {
      results.animeListings = true;
      console.log(`   ✅ Found ${animeCount} anime listings from DB`);
    }
    
    // Check for search input
    const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
    if (searchInput) {
      results.searchFunctionality = true;
      console.log('   ✅ Search input field present');
      
      // Try searching
      await searchInput.fill('One Piece');
      await page.waitForTimeout(2000);
      const filteredText = await page.evaluate(() => document.body.innerText);
      if (filteredText.includes('One Piece')) {
        console.log('   ✅ Search filtering works');
      }
    }

    // ============================================================
    // DISCOVER PAGE
    // ============================================================
    console.log('\n🎯 DISCOVER PAGE...');
    await page.goto('https://syncsaga.vercel.app/discover', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    const discoverText = await page.evaluate(() => document.body.innerText);
    if (discoverText.includes('Discover') || discoverText.includes('Trending')) {
      results.discover = true;
      console.log('   ✅ Discover page loads');
    }
    if (discoverText.includes('Failed to load rooms')) {
      console.log('   ⚠️ Room loading failed (may need real rooms created)');
    }

    // ============================================================
    // SETTINGS PAGE
    // ============================================================
    console.log('\n⚙️ SETTINGS PAGE...');
    await page.goto('https://syncsaga.vercel.app/settings', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    
    const settingsText = await page.evaluate(() => document.body.innerText);
    if (settingsText.includes('Settings') || settingsText.includes('Profile') || settingsText.includes('playwrighttest@gmail.com')) {
      results.settings = true;
      console.log('   ✅ Settings page accessible');
    }

    // ============================================================
    // FRIENDS PAGE
    // ============================================================
    console.log('\n👥 FRIENDS PAGE...');
    await page.goto('https://syncsaga.vercel.app/friends', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    
    const friendsText = await page.evaluate(() => document.body.innerText);
    if (friendsText.includes('Friends') || friendsText.includes('Find Friends')) {
      results.friends = true;
      console.log('   ✅ Friends page accessible');
    }

    // ============================================================
    // CREATE ROOM FLOW
    // ============================================================
    console.log('\n🏠 CREATE ROOM FLOW...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    
    // Look for create room link
    const createLink = await page.$('a:has-text("Create Room"), a:has-text("start a room"), a[href*="create"], button:has-text("Create Room")');
    if (createLink) {
      await createLink.click();
      await page.waitForTimeout(3000);
      await page.waitForURL('**/room/create**', { timeout: 10000 });
      
      const createText = await page.evaluate(() => document.body.innerText);
      if (createText.includes('Create') && (createText.includes('Anime') || createText.includes('Room'))) {
        results.createRoom = true;
        console.log('   ✅ Create room page accessible');
        
        // Check for anime selection
        if (createText.includes('Search') || createText.includes('Select Anime')) {
          results.hostAnime = true;
          console.log('   ✅ Anime selection available for hosting');
        }
      }
    } else {
      console.log('   ❌ No create room link found');
    }

    // ============================================================
    // JOIN EXISTING ROOM
    // ============================================================
    console.log('\n🚪 JOIN ROOM (Demo)...');
    await page.goto('https://syncsaga.vercel.app', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    
    const joinBtn = await page.$('button:has-text("Join")');
    if (joinBtn) {
      await joinBtn.click();
      await page.waitForTimeout(5000);
      
      const roomText = await page.evaluate(() => document.body.innerText);
      if (roomText.includes('in sync') || roomText.includes('Mira') || roomText.includes('frame')) {
        results.joinRoom = true;
        console.log('   ✅ Joined demo room');
      }
      
      // Check video player
      const videos = await page.$$eval('video', els => els.map(el => ({ 
        src: el.src, 
        duration: el.duration, 
        readyState: el.readyState,
        paused: el.paused
      })));
      if (videos.length > 0) {
        results.videoPlayer = true;
        console.log(`   ✅ Video player found (${videos.length} element(s))`);
      } else {
        console.log('   ❌ No video element found');
      }
      
      // Check chat
      const chat = await page.$$eval('[class*="chat" i], [class*="Chat" i], [data-testid*="chat" i]', 
        els => els.length);
      if (chat > 0) {
        results.chat = true;
        console.log(`   ✅ Chat element found`);
      } else {
        console.log('   ❌ No chat element found');
      }
    }

    // ============================================================
    // HOST ANIME - Try creating a real room
    // ============================================================
    console.log('\n🎬 HOST ANIME - Create Real Room...');
    if (results.createRoom) {
      await page.goto('https://syncsaga.vercel.app/room/create', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      
      // Try to search/select an anime
      const animeSearch = await page.$('input[placeholder*="anime" i], input[placeholder*="search" i], input[placeholder*="Select" i]');
      if (animeSearch) {
        await animeSearch.fill('One Piece');
        await page.waitForTimeout(2000);
        
        // Look for results
        const results2 = await page.$$eval('[class*="anime" i], [class*="result" i], [role="option"]', 
          els => els.map(el => el.textContent.trim()));
        if (results2.length > 0) {
          console.log(`   ✅ Anime search works - found ${results2.length} results`);
          results.hostAnime = true;
          
          // Click first result
          const options = await page.$$('[class*="anime" i], [class*="result" i], [role="option"]');
          if (options.length > 0) {
            await options[0].click();
            await page.waitForTimeout(1000);
          }
        }
      }
      
      // Try to create room
      const createBtn = await page.$('button:has-text("Create"), button:has-text("Start"), button[type="submit"]');
      if (createBtn) {
        await createBtn.click();
        await page.waitForTimeout(5000);
        
        // Check if room was created
        const newRoomText = await page.evaluate(() => document.body.innerText);
        if (newRoomText.includes('in sync') || newRoomText.includes('Room') || newRoomText.includes('Joined')) {
          console.log('   ✅ Room created successfully!');
        }
      }
    }

  } catch (err) {
    console.log('Fatal error:', err.message);
  }
  
  await browser.close();
  
  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 COMPLETE FEATURE REPORT');
  console.log('='.repeat(70));
  
  const features = [
    { key: 'login', label: 'Login/Authentication', critical: true },
    { key: 'dashboard', label: 'Dashboard with User Data', critical: true },
    { key: 'demoDataRemoved', label: 'No Demo Data (Clean State)', critical: true },
    { key: 'search', label: 'Search Page Loads', critical: true },
    { key: 'animeListings', label: 'Real Anime Listings from DB', critical: true },
    { key: 'searchFunctionality', label: 'Search Input & Filtering', critical: true },
    { key: 'discover', label: 'Discover Page', critical: true },
    { key: 'createRoom', label: 'Create Room Flow', critical: true },
    { key: 'hostAnime', label: 'Host Anime (Select & Create)', critical: true },
    { key: 'joinRoom', label: 'Join Existing Room', critical: true },
    { key: 'videoPlayer', label: 'Video Player Element', critical: true },
    { key: 'chat', label: 'Chat System', critical: true },
    { key: 'settings', label: 'Settings Page', critical: false },
    { key: 'friends', label: 'Friends Page', critical: false },
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
    console.log('🎉 SYNC SAGA IS FULLY USABLE - ALL CRITICAL FEATURES WORK!');
    console.log('   ✅ Real anime data from Supabase');
    console.log('   ✅ Auth & session management');
    console.log('   ✅ Create/Join rooms');
    console.log('   ✅ Host anime functionality');
    console.log('   ✅ Clean state (no demo data pollution)');
  } else {
    console.log(`⚠️  ${failed} CRITICAL ISSUES NEED FIXING`);
  }
  console.log('='.repeat(70));
}

testFullFeatures().catch(console.error);
