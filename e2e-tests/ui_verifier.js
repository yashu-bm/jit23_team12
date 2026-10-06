const puppeteer = require('puppeteer');

async function runUiVerification() {
  console.log('--- Starting UI Verification ---');
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Track console errors
    const errors = [];
    page.on('pageerror', err => {
      errors.push('Page Error: ' + err.toString());
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push('Console Error: ' + msg.text());
      }
    });

    console.log('Navigating to frontend...');
    const response = await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    if (response.status() !== 200) {
      throw new Error(`Frontend did not load. Status: ${response.status()}`);
    }

    console.log('Checking for blank page...');
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    if (!bodyHTML || bodyHTML.length < 50) {
      throw new Error('Blank page detected!');
    }
    
    if (errors.length > 0) {
      console.warn('UI Verification found console errors:', errors);
      // We log them but don't strictly fail unless it's a critical crash
      const criticalErrors = errors.filter(e => e.includes('Invariant Violation') || e.includes('ReferenceError'));
      if (criticalErrors.length > 0) {
        throw new Error('Critical React Errors found: ' + criticalErrors.join('\n'));
      }
    }

    console.log('UI rendered successfully without critical React errors.');
    console.log('--- UI Verification Completed Successfully ---');

  } catch (error) {
    console.error('UI Verification FAILED:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runUiVerification();
