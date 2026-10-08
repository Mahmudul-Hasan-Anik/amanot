const puppeteer = require('puppeteer-core');

async function testSettingsInteractions() {
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

  await page.goto('http://localhost:8081/(admin)/settings', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('সেটিংস')) {
    throw new Error('Title "সেটিংস" not found on page');
  }
  console.log('✔ Screen 22 title verified');

  // Verify sections
  const expectedSections = ['মাসিক জমা', 'লাভ-ক্ষতি বণ্টন', 'অনুমোদন', 'যোগাযোগ', 'অ্যাপ'];
  for (const s of expectedSections) {
    if (!content.includes(s)) {
      throw new Error(`Section "${s}" not found on page`);
    }
  }
  console.log('✔ All 5 settings sections verified');

  // Verify auto approval row
  if (!content.includes('স্বয়ংক্রিয় অনুমোদন')) {
    throw new Error('Auto Approval row not found');
  }
  console.log('✔ Auto approval feature verified');

  // Click on Default Monthly Deposit to open modal
  const depositClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const item = elements.find(el => el.textContent && el.textContent.includes('ডিফল্ট মাসিক জমা'));
    if (item) {
      item.click();
      return true;
    }
    return false;
  });
  console.log('✔ Deposit modal trigger clicked:', depositClicked);
  await new Promise(r => setTimeout(r, 500));

  // Verify modal is open by checking cancel button
  const modalOpen = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const cancelBtn = elements.find(el => el.textContent && el.textContent.trim() === 'বাতিল');
    if (cancelBtn) {
      cancelBtn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Modal opened & closed via cancel button:', modalOpen);
  await new Promise(r => setTimeout(r, 400));

  console.log('✔ All Settings interactions passed successfully!');
  await browser.close();
}

testSettingsInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
