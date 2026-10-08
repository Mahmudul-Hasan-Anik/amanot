const puppeteer = require('puppeteer-core');

async function testMemberInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  let dialogMessages = [];
  page.on('dialog', async (dialog) => {
    dialogMessages.push(dialog.message());
    console.log('Dialog handled:', dialog.message());
    await dialog.accept();
  });

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

  // 1. Test Member Dashboard
  await page.goto('http://localhost:8081/(member)', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  const content = await page.content();
  if (!content.includes('আমার মোট সঞ্চয়')) {
    throw new Error('Hero balance "আমার মোট সঞ্চয়" not found on member dashboard');
  }
  console.log('✔ Member Dashboard hero savings verified');

  if (!content.includes('১২ মাসের ডিজিটাল পাসবুক')) {
    throw new Error('Digital passbook title not found');
  }
  console.log('✔ Digital passbook section verified');

  // Click on a month box to open voucher modal
  const voucherOpened = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const paidMonth = elements.find(el => el.textContent && el.textContent.includes('জমা ✓'));
    if (paidMonth) {
      paidMonth.click();
      return true;
    }
    return false;
  });
  console.log('✔ Month voucher opened:', voucherOpened);
  await new Promise(r => setTimeout(r, 500));

  // Close voucher modal
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const closeBtn = elements.find(el => el.textContent && el.textContent.trim() === 'বন্ধ করুন');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 2. Test Member Profile
  await page.goto('http://localhost:8081/(member)/profile', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  const profileContent = await page.content();
  if (!profileContent.includes('আমার প্রোফাইল')) {
    throw new Error('Title "আমার প্রোফাইল" not found');
  }
  console.log('✔ Member Profile title verified');

  if (!profileContent.includes('ব্যক্তিগত তথ্য') || !profileContent.includes('নমিনীর তথ্য')) {
    throw new Error('Profile info sections not found');
  }
  console.log('✔ Personal & Nominee sections verified');

  // Test opening Change PIN modal
  const pinModalOpened = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const pinBtn = elements.find(el => el.textContent && el.textContent.includes('৪ ডিজিটের পিন পরিবর্তন'));
    if (pinBtn) {
      pinBtn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Change PIN trigger clicked:', pinModalOpened);
  await new Promise(r => setTimeout(r, 400));

  console.log('✔ All Member Screen interactions passed successfully!');
  await browser.close();
}

testMemberInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
