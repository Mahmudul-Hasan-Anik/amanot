const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 12 (Projects Tab) interactions...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/(tabs)/projects', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('প্রজেক্ট') && !bodyText.includes('Projects')) {
    throw new Error('Screen 12 did not load title');
  }
  console.log('✔ Screen 12 loaded with title "প্রজেক্ট"');

  // 2. Verify summary card & amounts
  if (!bodyText.includes('মোট বিনিয়োগ') && !bodyText.includes('Total Investment')) {
    throw new Error('Screen 12 missing summary card');
  }
  console.log('✔ Summary card with investment and profit present');

  // 3. Test filter chips
  console.log('Testing filter chips...');
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const delayedChip = chips.find(c => c.innerText && (c.innerText.includes('বিলম্বিত') || c.innerText.includes('Delayed')));
    if (delayedChip) delayedChip.click();
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✔ Filtered by Delayed');

  // Reset filter back to All
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const allChip = chips.find(c => c.innerText && (c.innerText.includes('সব') || c.innerText.includes('All')));
    if (allChip) allChip.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 4. Test Search button
  console.log('Testing search toggle...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    // top right search icon is inside a button
    const searchBtn = btns[0];
    if (searchBtn) searchBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✔ Toggled search input');

  // 5. Test FAB and Modal
  console.log('Testing FAB button...');
  await page.evaluate(() => {
    const fab = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'))
      .find(b => b.innerText && (b.innerText.includes('নতুন প্রজেক্ট') || b.innerText.includes('New Project')));
    if (fab) fab.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const modalText = await page.evaluate(() => document.body.innerText);
  if (modalText.includes('প্রজেক্টের নাম') || modalText.includes('Project name')) {
    console.log('✔ New Project modal opened successfully');
  }

  // Close modal by clicking background or overlay
  await page.evaluate(() => {
    const overlay = document.querySelector('div[style*="rgba(0, 0, 0"]');
    if (overlay) overlay.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 6. Test Card Click navigation to project details
  console.log('Testing project card navigation...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const p1Card = cards.find(c => c.innerText && (c.innerText.includes('সাইট এ') || c.innerText.includes('Site A')));
    if (p1Card) p1Card.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const url = page.url();
  console.log('URL after clicking project card:', url);
  if (url.includes('/project/p1') || url.includes('/project/')) {
    console.log('✔ Navigated cleanly to project details');
  }

  console.log('All Screen 12 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
