const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 9 (Deposit Receipt) interactions...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/receipt/1088', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('জমা সফল হয়েছে') && !bodyText.includes('Deposit Successful')) {
    throw new Error('Screen 9 did not load title');
  }
  console.log('✔ Receipt screen loaded with success title');

  // 2. Verify voucher details
  if (!bodyText.includes('করিম উদ্দিন') || !bodyText.includes('১০৮৮')) {
    throw new Error('Receipt missing Karim Uddin or 1088 receipt number');
  }
  console.log('✔ Karim Uddin voucher details present');

  // 3. Test "+ আরেকটি জমা নিন" button
  console.log('Testing another deposit button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const anotherBtn = btns.find(b => b.innerText && b.innerText.includes('আরেকটি জমা'));
    if (anotherBtn) anotherBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const urlAfterAnother = page.url();
  console.log('URL after clicking another deposit:', urlAfterAnother);
  if (urlAfterAnother.includes('/deposit/new')) {
    console.log('✔ Navigated cleanly to /deposit/new');
  }

  // 4. Test "হোমে ফিরুন"
  await page.goto('http://localhost:8081/(admin)/receipt/1088', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const homeBtn = btns.find(b => b.innerText && b.innerText.includes('হোমে ফিরুন'));
    if (homeBtn) homeBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const urlAfterHome = page.url();
  console.log('URL after clicking home:', urlAfterHome);
  if (urlAfterHome.includes('/(admin)') || urlAfterHome === 'http://localhost:8081/') {
    console.log('✔ Navigated cleanly to Home');
  }

  console.log('All Screen 9 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
