const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8081';
const OUT_DIR = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/screenshots/phase_a';
const ANDROID_OUT_DIR = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/screenshots/android';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(ANDROID_OUT_DIR)) fs.mkdirSync(ANDROID_OUT_DIR, { recursive: true });

const screens = [
  { id: 'screen-01', name: 'Screen 1: Login', route: '/(auth)/login' },
  { id: 'screen-02', name: 'Screen 2: PIN Entry', route: '/(auth)/pin' },
  { id: 'screen-03', name: 'Screen 3: Home Tab', route: '/(admin)' },
  { id: 'screen-04', name: 'Screen 4: Members Directory', route: '/(admin)/members' },
  { id: 'screen-05', name: 'Screen 5: Member Details', route: '/(admin)/member/2' },
  { id: 'screen-06', name: 'Screen 6: Add Member', route: '/(admin)/member/new' },
  { id: 'screen-07', name: 'Screen 7: Monthly Collection', route: '/(admin)/collection' },
  { id: 'screen-08', name: 'Screen 8: Deposit Entry', route: '/(admin)/deposit/new?memberId=2' },
  { id: 'screen-09', name: 'Screen 9: Deposit Receipt', route: '/(admin)/receipt/1' },
  { id: 'screen-10', name: 'Screen 10: Dues List', route: '/(admin)/due' },
  { id: 'screen-11', name: 'Screen 11: Send Reminder', route: '/(admin)/reminder' },
  { id: 'screen-12', name: 'Screen 12: Projects List', route: '/(admin)/projects' },
  { id: 'screen-13', name: 'Screen 13: Project Details', route: '/(admin)/project/1' },
  { id: 'screen-14', name: 'Screen 14: Cashflow / Income & Expense', route: '/(admin)/finance' },
  { id: 'screen-15', name: 'Screen 15: Add Expense', route: '/(admin)/expense/new' },
  { id: 'screen-16', name: 'Screen 16: Approvals', route: '/(admin)/approvals' },
  { id: 'screen-17', name: 'Screen 17: Analytics', route: '/(admin)/analytics' },
  { id: 'screen-18', name: 'Screen 18: Reports', route: '/(admin)/reports' },
  { id: 'screen-19', name: 'Screen 19: Send Statement', route: '/(admin)/statement' },
  { id: 'screen-20', name: 'Screen 20: Profit Distribution', route: '/(admin)/distribution' },
  { id: 'screen-21', name: 'Screen 21: More Menu', route: '/(admin)/more' },
  { id: 'screen-22', name: 'Screen 22: Settings', route: '/(admin)/settings' },
  { id: 'screen-23', name: 'Screen 23: Somiti Profile', route: '/(admin)/somiti' },
  { id: 'screen-24', name: 'Screen 24: Audit Log', route: '/(admin)/audit' },
  { id: 'member-01', name: 'Member Screen 1: Member Home', route: '/(member)' },
  { id: 'member-02', name: 'Member Screen 2: Member Profile', route: '/(member)/profile' },
];

const androidScreens = [
  { id: 'android-screen-01', name: 'Android Screen 1: Login', route: '/(auth)/login' },
  { id: 'android-screen-03', name: 'Android Screen 3: Home', route: '/(admin)' },
  { id: 'android-screen-05', name: 'Android Screen 5: Member Profile', route: '/(admin)/member/2' },
  { id: 'android-screen-08', name: 'Android Screen 8: Deposit Entry', route: '/(admin)/deposit/new?memberId=2' },
];

async function setupPageStorage(page, role = 'admin') {
  await page.evaluateOnNewDocument((targetRole) => {
    localStorage.setItem('amanot-auth-storage', JSON.stringify({
      state: {
        isAuthenticated: true,
        isPinVerified: true,
        userRole: targetRole,
        currentUser: {
          id: targetRole === 'admin' ? '1' : '2',
          code: targetRole === 'admin' ? 'SM-001' : 'SM-042',
          name: targetRole === 'admin' ? 'আনোয়ার হোসেন' : 'করিম উদ্দিন',
          role: targetRole === 'admin' ? 'সভাপতি · সুপার অ্যাডমিন' : 'সদস্য',
          phone: '01712-345678',
        },
      },
      version: 0,
    }));
    localStorage.setItem('amanot-app-settings-storage', JSON.stringify({
      state: {
        language: 'bn',
        useBengaliDigits: true,
        dueDateDay: 10,
        gracePeriodDays: 5,
        defaultMonthlyDeposit: 2000,
        lateFeeAmount: 100,
        expenseApprovalLimit: 10000,
        accountingYear: 'জানু – ডিসে',
        autoReminder: true,
      },
      version: 0,
    }));
  }, role);
}

async function run() {
  console.log('Launching Chrome for screenshot capture pass...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // 1. Capture 24 screens + 2 member screens on 390px Web
  console.log('\n--- Capturing 24 Admin Screens + 2 Member Screens (390px Web) ---');
  for (const item of screens) {
    const isMember = item.id.startsWith('member');
    await setupPageStorage(page, isMember ? 'member' : 'admin');

    const url = `${BASE_URL}${item.route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      // Give React Native render cycle 400ms to stabilize
      await new Promise(r => setTimeout(r, 400));

      const outPath = path.join(OUT_DIR, `${item.id}.png`);
      await page.screenshot({ path: outPath });
      console.log(`[OK] ${item.id} -> ${item.name}`);
    } catch (e) {
      console.error(`[FAIL] ${item.id} (${url}): ${e.message}`);
    }
  }

  // 2. Capture Android emulation screens
  console.log('\n--- Capturing Android Emulation Screens (Pixel 7 / Android UA) ---');
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36');
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });

  for (const item of androidScreens) {
    await setupPageStorage(page, 'admin');
    const url = `${BASE_URL}${item.route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 400));

      const outPath = path.join(ANDROID_OUT_DIR, `${item.id}.png`);
      await page.screenshot({ path: outPath });
      console.log(`[OK] ${item.id} -> ${item.name}`);
    } catch (e) {
      console.error(`[FAIL] ${item.id} (${url}): ${e.message}`);
    }
  }

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

run().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
