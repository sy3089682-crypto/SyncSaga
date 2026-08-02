const { chromium } = require('playwright');

async function testUserJourney() {
  console.log('=== Testing Real User Journey on Vercel Web ===');
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
    if (resp.status() >= 400 && !resp.url().includes('/health')) {
      errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    console.log('\n1. Loading home page...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    await page.screenshot({ path: '/tmp/user-1-home.png', fullPage: true });
    console.log('   ✅ Home page loaded');
    console.log(`   Title: "${await page.title()}"`);
    
    // Check for fake/placeholder data
    const homeContent = await page.content();
    const fakePatterns = ['Lorem ipsum', 'fake', 'placeholder', 'test data', 'mock', 'TODO', 'FIXME', 'example.com'];
    fakePatterns.forEach(pattern => {
      if (homeContent.toLowerCase().includes(pattern.toLowerCase())) {
        warnings.push(`Home page contains "${pattern}"`);
      }
    });
    
    // Look for navigation elements
    console.log('\n2. Checking navigation...');
    const navLinks = await page.$$eval('nav a, header a, [role="navigation"] a', els => 
      els.map(el => ({ text: el.textContent.trim(), href: el.href }))
    );
    console.log(`   Found ${navLinks.length} nav links:`);
    navLinks.forEach(l => console.log(`     - ${l.text}: ${l.href}`));
    
    // Try to find and click "Browse" or "Discover" or "Rooms"
    console.log('\n3. Looking for content pages...');
    const contentLinks = await page.$$eval('a[href*="/browse"], a[href*="/discover"], a[href*="/rooms"], a[href*="/anime"], a[href*="/watch"]', 
      els => els.map(el => ({ text: el.textContent.trim(), href: el.href })).slice(0, 10)
    );
    console.log(`   Found ${contentLinks.length} content links`);
    
    // Try to navigate to a room or browse page
    for (const link of contentLinks) {
      if (link.href && !link.href.includes('javascript:')) {
        console.log(`\n4. Navigating to: ${link.text} (${link.href})`);
        try {
          await page.goto(link.href, { waitUntil: 'networkidle', timeout: 30000 });
          await page.screenshot({ path: `/tmp/user-${Date.now()}-${link.text.replace(/\s+/g, '-')}.png`, fullPage: true });
          console.log(`   ✅ Loaded: "${await page.title()}"`);
          
          // Check for fake data on this page
          const pageContent = await page.content();
          fakePatterns.forEach(pattern => {
            if (pageContent.toLowerCase().includes(pattern.toLowerCase())) {
              warnings.push(`${link.text} page contains "${pattern}"`);
            }
          });
          
          // Check for actual anime/watch content
          if (pageContent.includes('anime') || pageContent.includes('episode') || pageContent.includes('watch') || pageContent.includes('room')) {
            console.log('   ✅ Page appears to have real content structure');
          }
          
          // Try to find interactive elements
          const buttons = await page.$$eval('button:not([disabled]), a[role="button"]:not([disabled])', 
            els => els.map(el => el.textContent.trim()).slice(0, 10)
          );
          console.log(`   Interactive elements: ${buttons.join(', ')}`);
          
          break; // Test one content page
        } catch (e) {
          console.log(`   ⚠️  Failed to load ${link.href}: ${e.message}`);
        }
      }
    }
    
    // Check for auth/sign-in flow
    console.log('\n5. Checking auth flow...');
    const authLinks = await page.$$eval('a[href*="/login"], a[href*="/signin"], a[href*="/signup"], a[href*="/register"], a[href*="/auth"]', 
      els => els.map(el => ({ text: el.textContent.trim(), href: el.href }))
    );
    if (authLinks.length > 0) {
      console.log(`   Found ${authLinks.length} auth links`);
      for (const link of authLinks.slice(0, 2)) {
        console.log(`   Trying: ${link.text} (${link.href})`);
        try {
          await page.goto(link.href, { waitUntil: 'networkidle', timeout: 30000 });
          await page.screenshot({ path: `/tmp/user-auth-${link.text.replace(/\s+/g, '-')}.png`, fullPage: true });
          console.log(`   ✅ Auth page loaded: "${await page.title()}"`);
          
          // Check for OAuth providers
          const oauthButtons = await page.$$eval('button, a', els => 
            els.filter(el => el.textContent.toLowerCase().includes('google') || 
                              el.textContent.toLowerCase().includes('github') ||
                              el.textContent.toLowerCase().includes('discord') ||
                              el.textContent.toLowerCase().includes('oauth') ||
                              el.textContent.toLowerCase().includes('supabase'))
            .map(el => el.textContent.trim())
          );
          console.log(`   OAuth providers: ${oauthButtons.join(', ') || 'none found'}`);
        } catch (e) {
          console.log(`   ⚠️  Auth page failed: ${e.message}`);
        }
      }
    } else {
      console.log('   No explicit auth links found (may be handled differently)');
    }
    
    // Check for API integration by looking at network calls
    console.log('\n6. Checking API integration...');
    const apiCalls = [];
    page.on('response', resp => {
      if (resp.url().includes('api') || resp.url().includes('supabase') || resp.url().includes('render')) {
        apiCalls.push({ url: resp.url(), status: resp.status() });
      }
    });
    
    // Reload home to capture API calls
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    console.log(`   API calls detected: ${apiCalls.length}`);
    apiCalls.slice(0, 10).forEach(call => 
      console.log(`     ${call.status} ${call.url}`)
    );
    
    // Check for Supabase client errors
    const supabaseErrors = apiCalls.filter(c => c.url.includes('supabase') && c.status >= 400);
    if (supabaseErrors.length > 0) {
      errors.push(`Supabase API errors: ${supabaseErrors.map(e => `${e.status} ${e.url}`).join(', ')}`);
    }
    
  } catch (err) {
    errors.push(`Navigation failed: ${err.message}`);
    console.log('❌ Fatal error:', err.message);
  }
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  if (errors.length === 0) {
    console.log('🎉 NO CRITICAL ERRORS');
  } else {
    console.log(`❌ ${errors.length} error(s):`);
    errors.forEach(e => console.log('  -', e));
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):`);
    warnings.forEach(w => console.log('  -', w));
  }
  
  return { errors, warnings };
}

testUserJourney().then(result => {
  process.exit(result.errors.length > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
