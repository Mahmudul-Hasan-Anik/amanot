const puppeteer = require('puppeteer-core');
const path = require('path');

const OUT_DIR = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/screenshots/phase_b';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // First switch to English on login or settings
  await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('*'));
    for (const el of divs) {
      if (el.textContent && el.textContent.trim() === 'English') {
        el.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Navigate to (admin)/deposit/new?memberId=6
  await page.goto('http://localhost:8081/(admin)/deposit/new?memberId=6', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, 'screen-08-deposit-fixed-english.png') });
  console.log('Saved screen-08-deposit-fixed-english.png');

  // Switch back to Bangla
  await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('*'));
    for (const el of divs) {
      if (el.textContent && el.textContent.trim() === 'বাংলা') {
        el.click();
        break;
      }
    }
  });

  await browser.close();
}

run().catch(console.error);
