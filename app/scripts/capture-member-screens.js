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

  // Set auth state first
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(() => {
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: { language: 'bn', useBengaliDigits: true },
      version: 0
    }));
    localStorage.setItem('amanot-auth-storage', JSON.stringify({
      state: {
        isAuthenticated: true,
        isPinVerified: true,
        userRole: 'member',
        currentUser: {
          id: 'm1',
          code: 'SM-001',
          name: 'আনোয়ার হোসেন',
          phone: '01711000001',
          totalDeposit: 144000,
          monthlyAmount: 2000,
          status: 'paid'
        }
      },
      version: 0
    }));
  });

  // 1. Member Dashboard
  await page.goto('http://localhost:8081/(member)', { waitUntil: 'networkidle0', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1200));

  const p1 = path.join(OUT_DIR_B, 'screen-member-dashboard.png');
  const p1Root = path.join(OUT_DIR_ROOT, 'screen-member-dashboard.png');
  await page.screenshot({ path: p1 });
  fs.copyFileSync(p1, p1Root);
  console.log('Saved screen-member-dashboard.png');

  // Full height view
  await page.setViewport({ width: 390, height: 1200, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 400));
  const p2 = path.join(OUT_DIR_B, 'screen-member-dashboard-full.png');
  const p2Root = path.join(OUT_DIR_ROOT, 'screen-member-dashboard-full.png');
  await page.screenshot({ path: p2 });
  fs.copyFileSync(p2, p2Root);
  console.log('Saved screen-member-dashboard-full.png');

  // 2. Member Profile
  await page.goto('http://localhost:8081/(member)/profile', { waitUntil: 'networkidle0', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1200));
  const p3 = path.join(OUT_DIR_B, 'screen-member-profile.png');
  const p3Root = path.join(OUT_DIR_ROOT, 'screen-member-profile.png');
  await page.screenshot({ path: p3 });
  fs.copyFileSync(p3, p3Root);
  console.log('Saved screen-member-profile.png');

  await browser.close();
  console.log('All Member screen captures complete!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
