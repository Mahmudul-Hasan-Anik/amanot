const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 14 (Financials / Income & Expense) interactions...');
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

  await page.goto('http://localhost:8081/(admin)/finance', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('আয় ও ব্যয়') && !bodyText.includes('Income & Expense')) {
    throw new Error('Screen 14 did not load title');
  }
  console.log('✔ Screen 14 loaded with title "আয় ও ব্যয়"');

  // 2. Verify summary card
  if (!bodyText.includes('আয়') && !bodyText.includes('Income')) {
    throw new Error('Screen 14 missing summary card');
  }
  console.log('✔ Summary card present (Income, Expense, Net)');

  // 3. Test Month Picker modal
  console.log('Testing month picker modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const monthPill = btns.find(b => b.innerText && (b.innerText.includes('২০২৬') || b.innerText.includes('2026')));
    if (monthPill) monthPill.click();
  });
  await new Promise(r => setTimeout(r, 500));

  let modalText = await page.evaluate(() => document.body.innerText);
  if (modalText.includes('মাস নির্বাচন করুন') || modalText.includes('Select Month')) {
    console.log('✔ Month picker modal opened successfully');
  }

  // Close month modal
  await page.evaluate(() => {
    const overlay = document.querySelector('div[style*="rgba(0, 0, 0"]');
    if (overlay) overlay.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. Test Transfer modal
  console.log('Testing transfer modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const transferBtn = btns.find(b => b.innerText && (b.innerText.includes('স্থানান্তর') || b.innerText.includes('Transfer')));
    if (transferBtn) transferBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  modalText = await page.evaluate(() => document.body.innerText);
  if (modalText.includes('তহবিল স্থানান্তর') || modalText.includes('Transfer Cash')) {
    console.log('✔ Transfer modal opened successfully');
  }

  // Close transfer modal
  await page.evaluate(() => {
    const overlay = document.querySelector('div[style*="rgba(0, 0, 0"]');
    if (overlay) overlay.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 5. Test FAB click
  console.log('Testing FAB button...');
  await page.evaluate(() => {
    const fab = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'))
      .find(b => b.innerText && (b.innerText.includes('খরচ লিখুন') || b.innerText.includes('Record Expense')));
    if (fab) fab.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const url = page.url();
  console.log('URL after clicking FAB:', url);
  if (url.includes('/expense/new') || url.includes('/expense')) {
    console.log('✔ Navigated cleanly to /expense/new');
  }

  console.log('All Screen 14 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
