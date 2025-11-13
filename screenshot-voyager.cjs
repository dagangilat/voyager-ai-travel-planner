const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureWebsite() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Navigating to https://voyager-ai-travel-planner.web.app/...');
  await page.goto('https://voyager-ai-travel-planner.web.app/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // Wait a bit more for any animations/lazy loading
  await page.waitForTimeout(2000);
  
  // Take screenshot
  const screenshotPath = path.join(__dirname, 'voyager-screenshot.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  // Get page snapshot (HTML content)
  const html = await page.content();
  const snapshotPath = path.join(__dirname, 'voyager-snapshot.html');
  fs.writeFileSync(snapshotPath, html);
  console.log(`HTML snapshot saved to: ${snapshotPath}`);
  
  // Get page title and URL
  const title = await page.title();
  const url = page.url();
  console.log(`\nPage Title: ${title}`);
  console.log(`URL: ${url}`);
  
  await browser.close();
  console.log('\nDone!');
}

captureWebsite().catch(console.error);
