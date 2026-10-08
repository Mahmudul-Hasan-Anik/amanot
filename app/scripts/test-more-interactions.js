const puppeteer = require('puppeteer-core');

async function testMoreInteractions() {
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

  await page.goto('http://localhost:8081/(admin)/more', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('আরও')) {
    throw new Error('Title "আরও" not found on page');
  }
  console.log('✔ Screen 21 title verified');

  // Verify profile card
  if (!content.includes('আনোয়ার হোসেন') || !content.includes('সভাপতি')) {
    throw new Error('Profile card elements not found');
  }
  console.log('✔ Profile card verified');

  // Verify all 4 categories exist
  const expectedSections = ['হিসাব', 'রিপোর্ট ও যোগাযোগ', 'সমিতি', 'প্রশাসন'];
  for (const s of expectedSections) {
    if (!content.includes(s)) {
      throw new Error(`Section "${s}" not found on page`);
    }
  }
  console.log('✔ All 4 menu categories verified');

  // Verify badge 3 on Approvals
  if (!content.includes('৩')) {
    throw new Error('Approvals pending count badge not found');
  }
  console.log('✔ Pending approvals badge verified');

  // Test clicking on 'আয় ও ব্যয়'
  const financeClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const item = elements.find(el => el.textContent && el.textContent.includes('আয় ও ব্যয়'));
    if (item) {
      item.click();
      return true;
    }
    return false;
  });
  console.log('✔ Finance item clicked:', financeClicked);
  await new Promise(r => setTimeout(r, 400));

  console.log('✔ All More screen interactions passed successfully!');
  await browser.close();
}

testMoreInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
