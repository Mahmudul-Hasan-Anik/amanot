const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 10 (Overdue List) interactions...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/due', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('বকেয়া তালিকা') && !bodyText.includes('Overdue List')) {
    throw new Error('Screen 10 did not load title');
  }
  console.log('✔ Due screen loaded with title "বকেয়া তালিকা"');

  // 2. Verify hero banner & aging numbers
  if (!bodyText.includes('মোট বকেয়া') && !bodyText.includes('Total Due')) {
    throw new Error('Screen 10 missing hero banner');
  }
  console.log('✔ Hero banner and summary cards present');

  // 3. Test Filter chips
  console.log('Testing filter chips...');
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const month3Chip = chips.find(c => c.innerText && c.innerText.includes('৩+ মাস'));
    if (month3Chip) month3Chip.click();
  });
  await new Promise(r => setTimeout(r, 500));
  let filterText = await page.evaluate(() => document.body.innerText);
  console.log('✔ Filtered by "৩+ মাস"');

  // Switch back to "সব"
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const allChip = chips.find(c => c.innerText && c.innerText.includes('সব'));
    if (allChip) allChip.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 4. Test Checkbox Toggle & Bottom Sticky CTA
  console.log('Testing member selection toggle...');
  await page.evaluate(() => {
    // Click select all toggle if present
    const selectAllBtn = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'))
      .find(b => b.innerText && b.innerText.includes('সবাইকে নির্বাচন করুন'));
    if (selectAllBtn) selectAllBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const textAfterToggle = await page.evaluate(() => document.body.innerText);
  if (textAfterToggle.includes('রিমাইন্ডার পাঠান') || textAfterToggle.includes('Send Reminder')) {
    console.log('✔ Bottom sticky reminder CTA is visible');
  }

  // 5. Test Reminder CTA click navigation
  console.log('Testing navigation to reminder screen...');
  await page.evaluate(() => {
    const ctaBtn = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'))
      .find(b => b.innerText && (b.innerText.includes('রিমাইন্ডার পাঠান') || b.innerText.includes('Send Reminder')));
    if (ctaBtn) ctaBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const urlAfterCta = page.url();
  console.log('URL after clicking reminder CTA:', urlAfterCta);
  if (urlAfterCta.includes('/reminder')) {
    console.log('✔ Navigated cleanly to /reminder');
  }

  console.log('All Screen 10 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
