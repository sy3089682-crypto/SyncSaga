const { chromium } = require('playwright');

async function testDeepDive() {
  console.log('=== Deep Dive into Vercel Web App ===');
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
    if (resp.status() >= 400) {
      errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    await page.goto('https://syncsaga-sy3089682-gmailcoms-projects.vercel.app', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    await page.screenshot({ path: '/tmp/deep-home.png', fullPage: true });
    
    // Get all interactive elements
    const allElements = await page.evaluate(() => {
      const results = {
        links: [],
        buttons: [],
        forms: [],
        inputs: [],
        nav: [],
        anyClickable: []
      };
      
      // All links
      document.querySelectorAll('a[href]').forEach(el => {
        results.links.push({
          text: el.textContent.trim().substring(0, 100),
          href: el.href,
          classes: el.className,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        });
      });
      
      // All buttons
      document.querySelectorAll('button').forEach(el => {
        results.buttons.push({
          text: el.textContent.trim().substring(0, 100),
          classes: el.className,
          disabled: el.disabled,
          type: el.type,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        });
      });
      
      // Forms
      document.querySelectorAll('form').forEach(el => {
        results.forms.push({
          action: el.action,
          method: el.method,
          inputs: Array.from(el.querySelectorAll('input, select, textarea')).map(i => ({
            type: i.type,
            name: i.name,
            placeholder: i.placeholder
          }))
        });
      });
      
      // Inputs
      document.querySelectorAll('input, select, textarea').forEach(el => {
        results.inputs.push({
          type: el.type || el.tagName.toLowerCase(),
          name: el.name,
          placeholder: el.placeholder,
          classes: el.className
        });
      });
      
      // Nav elements
      document.querySelectorAll('nav, [role="navigation"], header').forEach(el => {
        results.nav.push({
          tag: el.tagName,
          classes: el.className,
          children: el.children.length,
          html: el.innerHTML.substring(0, 500)
        });
      });
      
      // Anything with click handlers
      document.querySelectorAll('[onclick], [role="button"], [tabindex="0"]').forEach(el => {
        results.anyClickable.push({
          tag: el.tagName,
          text: el.textContent.trim().substring(0, 100),
          classes: el.className
        });
      });
      
      return results;
    });
    
    console.log('\n=== LINKS ===');
    allElements.links.forEach(l => console.log(`  ${l.visible ? '✅' : '👻'} ${l.text} -> ${l.href}`));
    
    console.log('\n=== BUTTONS ===');
    allElements.buttons.forEach(b => console.log(`  ${b.visible ? '✅' : '👻'} ${b.text} (disabled: ${b.disabled})`));
    
    console.log('\n=== FORMS ===');
    allElements.forms.forEach(f => console.log(`  Form: ${f.method} ${f.action}`));
    
    console.log('\n=== INPUTS ===');
    allElements.inputs.forEach(i => console.log(`  ${i.type}: name="${i.name}" placeholder="${i.placeholder}"`));
    
    console.log('\n=== NAV ===');
    allElements.nav.forEach(n => console.log(`  <${n.tag}> ${n.children} children`));
    
    console.log('\n=== CLICKABLE ===');
    allElements.anyClickable.forEach(c => console.log(`  ${c.tag}: ${c.text}`));
    
    // Get full page text to understand structure
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== PAGE TEXT (first 2000 chars) ===');
    console.log(pageText.substring(0, 2000));
    
    // Check for Supabase/client-side app initialization
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map(s => ({
        src: s.src,
        inline: s.innerHTML.substring(0, 200)
      }));
    });
    console.log('\n=== SCRIPTS ===');
    scripts.forEach(s => {
      if (s.src) console.log(`  External: ${s.src}`);
      if (s.inline && s.inline.trim()) console.log(`  Inline: ${s.inline.substring(0, 150)}...`);
    });
    
    // Check localStorage, sessionStorage
    const storage = await page.evaluate(() => ({
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage)
    }));
    console.log('\n=== STORAGE ===');
    console.log(`  localStorage: ${storage.localStorage.join(', ') || 'empty'}`);
    console.log(`  sessionStorage: ${storage.sessionStorage.join(', ') || 'empty'}`);
    
  } catch (err) {
    errors.push(`Fatal: ${err.message}`);
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

testDeepDive().catch(console.error);
