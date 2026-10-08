const puppeteer = require('puppeteer-core');

async function testSomitiInteractions() {
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

  await page.goto('http://localhost:8081/(admin)/somiti', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('সমিতির প্রোফাইল')) {
    throw new Error('Title "সমিতির প্রোফাইল" not found on page');
  }
  console.log('✔ Screen 23 title verified');

  // Verify 3 stat cards
  if (!content.includes('সদস্য') || !content.includes('তহবিল') || !content.includes('প্রজেক্ট')) {
    throw new Error('Stats cards not found');
  }
  console.log('✔ 3 Stats cards verified');

  // Verify committee members
  if (!content.includes('আনোয়ার হোসেন') || !content.includes('জাহিদ হাসান')) {
    throw new Error('Committee members not found');
  }
  console.log('✔ Committee members verified');

  // Verify sections
  const expectedSections = ['যোগাযোগ', 'কমিটি', 'জমা দেওয়ার হিসাব', 'ডকুমেন্ট'];
  for (const s of expectedSections) {
    if (!content.includes(s)) {
      throw new Error(`Section "${s}" not found on page`);
    }
  }
  console.log('✔ All sections verified');

  // Test opening History modal
  const historyClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const item = elements.find(el => el.textContent && el.textContent.trim() === 'ইতিহাস');
    if (item) {
      item.click();
      return true;
    }
    return false;
  });
  console.log('✔ History link clicked:', historyClicked);
  await new Promise(r => setTimeout(r, 400));

  // Close history modal if open
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const closeBtn = elements.find(el => el.textContent && el.textContent.trim() === 'বন্ধ করুন');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  console.log('✔ All Somiti Profile interactions passed successfully!');
  await browser.close();
}

testSomitiInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
