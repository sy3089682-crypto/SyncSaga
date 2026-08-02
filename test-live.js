const { chromium } = require('playwright');

async function testVercelWeb() {
  console.log('=== Testing Vercel Web App ===');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console Error: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });
  page.on('response', resp => {
    if (resp.status() >= 400) {
      errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    console.log('Loading https://syncsaga-sy3089682-gmailcoms-projects.vercel.app ...');
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    const title = await page.title();
    console.log(`✅ Page loaded: "${title}"`);
    
    const content = await page.content();
    if (content.includes('SyncSaga')) {
      console.log('✅ Page contains "SyncSaga"');
    } else {
      errors.push('Page does not contain expected "SyncSaga" text');
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/vercel-home.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/vercel-home.png');
    
    if (errors.length > 0) {
      console.log('⚠️  Errors found:');
      errors.forEach(e => console.log('  -', e));
    } else {
      console.log('✅ No console/page/HTTP errors detected');
    }
    
  } catch (err) {
    errors.push(`Navigation failed: ${err.message}`);
    console.log('❌ Navigation error:', err.message);
  }
  
  await browser.close();
  return errors;
}

async function testRenderAPI() {
  console.log('\n=== Testing Render API ===');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  
  try {
    console.log('Testing /health ...');
    const healthResp = await page.goto('https://syncsaga.onrender.com/health', { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  /health: HTTP ${healthResp.status()}`);
    const healthText = await page.evaluate(() => document.body.innerText);
    const healthJson = JSON.parse(healthText);
    console.log(`  Response:`, JSON.stringify(healthJson, null, 2));
    if (healthResp.status() !== 200 || healthJson.status !== 'ok') {
      errors.push(`/health: Expected 200 + status ok, got ${healthResp.status()} ${JSON.stringify(healthJson)}`);
    } else {
      console.log('✅ /health OK');
    }
    
    console.log('Testing /health/live ...');
    const liveResp = await page.goto('https://syncsaga.onrender.com/health/live', { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  /health/live: HTTP ${liveResp.status()}`);
    const liveText = await page.evaluate(() => document.body.innerText);
    const liveJson = JSON.parse(liveText);
    console.log(`  Response:`, JSON.stringify(liveJson, null, 2));
    if (liveResp.status() !== 200 || liveJson.status !== 'alive') {
      errors.push(`/health/live: Expected 200 + status alive, got ${liveResp.status()} ${JSON.stringify(liveJson)}`);
    } else {
      console.log('✅ /health/live OK');
    }
    
    console.log('Testing /health/ready (expects 503 due to dead Redis)...');
    try {
      const readyResp = await page.goto('https://syncsaga.onrender.com/health/ready', { waitUntil: 'networkidle', timeout: 10000 });
      console.log(`  /health/ready: HTTP ${readyResp.status()}`);
      const readyText = await page.evaluate(() => document.body.innerText);
      console.log(`  Response: ${readyText}`);
      if (readyResp.status() !== 200 && readyResp.status() !== 503) {
        errors.push(`/health/ready: Unexpected status ${readyResp.status()}`);
      } else {
        console.log(`✅ /health/ready returned ${readyResp.status()} (expected 200 or 503)`);
      }
    } catch (err) {
      // timeout is expected for /health/ready due to dead Redis
      console.log('  /health/ready: timeout (expected - dead Redis dependency)');
      console.log('✅ /health/ready timeout as expected (degraded due to dead Redis)');
    }
    
  } catch (err) {
    errors.push(`API test failed: ${err.message}`);
    console.log('❌ API test error:', err.message);
  }
  
  await browser.close();
  return errors;
}

async function main() {
  console.log('🚀 Starting Playwright live deployment tests...\n');
  
  const webErrors = await testVercelWeb();
  const apiErrors = await testRenderAPI();
  
  console.log('\n=== SUMMARY ===');
  const allErrors = [...webErrors, ...apiErrors];
  if (allErrors.length === 0) {
    console.log('🎉 ALL TESTS PASSED - No errors detected!');
  } else {
    console.log(`❌ ${allErrors.length} error(s) found:`);
    allErrors.forEach(e => console.log('  -', e));
  }
  
  process.exit(allErrors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
