const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR_B = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/screenshots/phase_b';
const OUT_DIR_ROOT = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // 1. Bengali mode (default)
  await page.goto('http://localhost:8081/(admin)/reports', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'bn', useBengaliDigits: true },
      version: 0
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const p1 = path.join(OUT_DIR_B, 'screen-18.png');
  const p1Root = path.join(OUT_DIR_ROOT, 'screen-18.png');
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p1Root);
  console.log('Saved screen-18.png');

  // Full height view
  await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 400));
  const p2 = path.join(OUT_DIR_B, 'screen-18-full.png');
  const p2Root = path.join(OUT_DIR_ROOT, 'screen-18-full.png');
  await page.screenshot({ path: p2 });
  fs.copyFileSync(p2, p2Root);
  console.log('Saved screen-18-full.png');

  // 2. English mode
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'en', useBengaliDigits: false },
      version: 0
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const p3 = path.join(OUT_DIR_B, 'screen-18-en.png');
  const p3Root = path.join(OUT_DIR_ROOT, 'screen-18-en.png');
  await page.screenshot({ path: p3 });
  fs.copyFileSync(p3, p3Root);
  console.log('Saved screen-18-en.png');

  // Reset back to Bengali default
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'bn', useBengaliDigits: true },
      version: 0
    }));
  });

  await browser.close();
}

run().catch(console.error);
