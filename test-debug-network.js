const { chromium } = require('playwright');

async function testDebug() {
  console.log('=== Debug Network Calls ===');
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: '/tmp/playwright-browsers/chromium-1234/chrome-linux64/chrome' 
  });
  const page = await browser.newPage();
  
  const errors = [];
  const networkCalls = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`Console Error: ${msg.text()}`);
    if (msg.type() === 'warning') console.log(`Console Warning: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`Page Error: ${err.message}`));
  page.on('response', resp => {
    networkCalls.push({ url: resp.url(), status: resp.status() });
    if (resp.status() >= 400) console.log(`HTTP ${resp.status()}: ${resp.url()}`);
  });

  try {
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app/auth/register', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('\n--- Filling signup form ---');
    await page.fill('input[placeholder="you@example.com"]', 'debuguser@gmail.com');
    await page.fill('input[placeholder="At least 8 characters"]', 'TestPass123!');
    await page.fill('input[placeholder="coolwatcher"]', 'debuguser');
    
    console.log('\n--- Submitting signup (monitoring network) ---');
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Sign up"), button:has-text("Register")');
    await page.waitForTimeout(8000);
    
    console.log('\n=== ALL NETWORK CALLS ===');
    networkCalls.forEach(c => console.log(`  ${c.status} ${c.url}`));
    
    console.log('\n=== SUPABASE CALLS ===');
    const sbCalls = networkCalls.filter(c => c.url.includes('supabase'));
    sbCalls.forEach(c => console.log(`  ${c.status} ${c.url}`));
    
    const afterSignup = await page.evaluate(() => document.body.innerText);
    console.log('\nSignup result (first 2000):');
    console.log(afterSignup.substring(0, 2000));
    
  } catch (err) {
    console.error('Fatal:', err.message);
  }
  
  await browser.close();
}

testDebug().catch(console.error);
