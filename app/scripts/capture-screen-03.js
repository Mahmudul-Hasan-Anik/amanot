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

  // Navigate to (admin)/(tabs)
  await page.goto('http://localhost:8081/(admin)/(tabs)', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT_DIR, 'screen-03.png') });
  console.log('Saved screen-03.png');

  // Scroll down to capture lower sections (Today's Follow-up & Pending Approvals)
  await page.evaluate(() => {
    window.scrollBy(0, 600);
    const scrollables = document.querySelectorAll('*');
    for (const el of scrollables) {
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
        el.scrollTop += 600;
      }
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-03-bottom.png') });
  console.log('Saved screen-03-bottom.png');

  await browser.close();
}

run().catch(console.error);
