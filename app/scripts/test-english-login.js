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

  await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));

  // Click English
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

  // Click "Send OTP"
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('*'));
    for (const el of divs) {
      if (el.textContent && el.textContent.trim() === 'Send OTP') {
        el.click();
        break;
      }
    }
  });

  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-01-otp-english.png') });
  console.log('Saved screen-01-otp-english.png');

  // Let's also toggle back to Bangla so the app stays in Bangla default
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('*'));
    for (const el of divs) {
      if (el.textContent && el.textContent.trim() === 'বাংলা') {
        el.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-01-otp-bangla.png') });
  console.log('Saved screen-01-otp-bangla.png');

  await browser.close();
}

run().catch(console.error);
