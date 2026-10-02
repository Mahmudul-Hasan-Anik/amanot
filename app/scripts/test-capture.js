const puppeteer = require('puppeteer-core');
const path = require('path');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0', timeout: 30000 });
  
  const outPath = path.resolve('C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/test_screenshot.png');
  await page.screenshot({ path: outPath });
  console.log('Saved test screenshot to:', outPath);
  await browser.close();
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
