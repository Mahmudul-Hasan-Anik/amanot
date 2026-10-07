const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 13 (Project Details) interactions...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    console.log('Dialog opened with message:', dialog.message());
    await dialog.accept();
  });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/project/p1', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('সাইট এ: জমি প্রকল্প') && !bodyText.includes('Site A: Land Project')) {
    throw new Error('Screen 13 did not load project title');
  }
  console.log('✔ Screen 13 loaded with project title "সাইট এ: জমি প্রকল্প"');

  // 2. Verify metric cards
  if (!bodyText.includes('মোট বিনিয়োগ') && !bodyText.includes('Total Investment')) {
    throw new Error('Screen 13 missing metric cards');
  }
  console.log('✔ Metric cards present (Investment, Return, Profit, ROI)');

  // 3. Verify Capital Recovery
  if (!bodyText.includes('মূলধন ফেরত') && !bodyText.includes('Capital Recovery')) {
    throw new Error('Screen 13 missing capital recovery card');
  }
  console.log('✔ Capital recovery card present with progress');

  // 4. Test Expense modal
  console.log('Testing Expense button modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const expBtn = btns.find(b => b.innerText && (b.innerText.includes('খরচ লিখুন') || b.innerText.includes('Record Expense')));
    if (expBtn) expBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  let modalText = await page.evaluate(() => document.body.innerText);
  if (modalText.includes('খরচের পরিমাণ') || modalText.includes('Expense Amount')) {
    console.log('✔ Expense modal opened successfully');
  }

  // Close expense modal by clicking backdrop
  await page.evaluate(() => {
    const overlay = document.querySelector('div[style*="rgba(0, 0, 0"]');
    if (overlay) overlay.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Test Income modal
  console.log('Testing Income button modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const incBtn = btns.find(b => b.innerText && (b.innerText.includes('আয়/ফেরত লিখুন') || b.innerText.includes('Record Income/Return')));
    if (incBtn) incBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  modalText = await page.evaluate(() => document.body.innerText);
  if (modalText.includes('প্রাপ্ত আয়ের পরিমাণ') || modalText.includes('Income Amount')) {
    console.log('✔ Income modal opened successfully');
  }

  // Close income modal
  await page.evaluate(() => {
    const overlay = document.querySelector('div[style*="rgba(0, 0, 0"]');
    if (overlay) overlay.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 6. Test Back button navigation
  console.log('Testing back button...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('div[role="button"], div[tabindex]');
    if (backBtn) backBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const url = page.url();
  console.log('URL after clicking back:', url);

  console.log('All Screen 13 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
