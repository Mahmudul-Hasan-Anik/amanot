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
  // Set viewport tall enough to capture the entire form
  await page.setViewport({ width: 390, height: 1650, deviceScaleFactor: 2 });

  // 1. Bengali mode (default)
  await page.goto('http://localhost:8081/(admin)/member/new', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'bn', useBengaliDigits: true },
      version: 0
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06.png') });
  console.log('Saved screen-06.png (Bengali full height)');

  // 2. English mode
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'en', useBengaliDigits: false },
      version: 0
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-en.png') });
  console.log('Saved screen-06-en.png (English full height)');

  // Reset back to Bengali default for other tests
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'bn', useBengaliDigits: true },
      version: 0
    }));
  });

  await browser.close();
}

run().catch(console.error);
