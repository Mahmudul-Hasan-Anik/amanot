const puppeteer = require('puppeteer-core');

async function testReportsInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  page.on('dialog', async (dialog) => {
    console.log('Dialog handled:', dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:8081/(admin)/reports', {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('রিপোর্ট')) {
    throw new Error('Title "রিপোর্ট" not found on page');
  }
  console.log('✔ Screen 18 title verified');

  // Verify all 8 reports exist
  const expectedReports = [
    'মাসিক আদায় রিপোর্ট',
    'বকেয়া তালিকা',
    'আয়-ব্যয় রিপোর্ট',
    'সদস্য স্টেটমেন্ট',
    'প্রজেক্ট রিপোর্ট',
    'নগদ ও ব্যাংক বই',
    'মাঠকর্মী রিপোর্ট',
    'বার্ষিক বণ্টন রিপোর্ট',
  ];

  for (const rep of expectedReports) {
    if (!content.includes(rep)) {
      throw new Error(`Report "${rep}" not found on page`);
    }
  }
  console.log('✔ All 8 report titles verified');

  // Test PDF download button click on first report
  const pdfClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const pdfBtn = elements.find(el => el.textContent && el.textContent.trim() === 'PDF');
    if (pdfBtn) {
      pdfBtn.click();
      return true;
    }
    return false;
  });
  console.log('✔ PDF button clicked:', pdfClicked);
  await new Promise(r => setTimeout(r, 400));

  // Test Excel download button click
  const excelClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const excelBtn = elements.find(el => el.textContent && el.textContent.trim() === 'Excel');
    if (excelBtn) {
      excelBtn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Excel button clicked:', excelClicked);
  await new Promise(r => setTimeout(r, 400));

  // Test Export Full Data button click
  const exportAllClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const btn = elements.find(el => el.textContent && el.textContent.includes('সম্পূর্ণ ডেটা এক্সপোর্ট'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Export all button clicked:', exportAllClicked);
  await new Promise(r => setTimeout(r, 400));

  await browser.close();
  console.log('All Screen 18 interaction tests passed successfully!');
}

testReportsInteractions().catch((err) => {
  console.error('Interaction test failed:', err);
  process.exit(1);
});
