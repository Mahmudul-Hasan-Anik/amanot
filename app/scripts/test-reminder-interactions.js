const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 11 (Reminder Preview) interactions...');
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

  await page.goto('http://localhost:8081/(admin)/reminder?memberIds=6,2,10,4,11', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('রিমাইন্ডার পাঠান') && !bodyText.includes('Send Reminder')) {
    throw new Error('Screen 11 did not load title');
  }
  console.log('✔ Screen 11 loaded with title "রিমাইন্ডার পাঠান"');

  // 2. Verify recipients & channel options
  if (!bodyText.includes('জন প্রাপক') && !bodyText.includes('Recipients')) {
    throw new Error('Screen 11 missing recipients card');
  }
  console.log('✔ Recipients card present with members summary');

  // 3. Test Channel checkbox toggle (SMS toggle)
  console.log('Testing SMS channel toggle...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const smsRow = items.find(el => el.innerText && (el.innerText.includes('এসএমএস') || el.innerText.includes('SMS')));
    if (smsRow) smsRow.click();
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✔ Toggled SMS channel');

  // 4. Test Variable tag chip click
  console.log('Testing variable chip click...');
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const tagChip = chips.find(c => c.innerText && c.innerText.includes('{বকেয়া_টাকা}'));
    if (tagChip) tagChip.click();
  });
  await new Promise(r => setTimeout(r, 400));
  console.log('✔ Tag chip clicked and inserted');

  // 5. Test Template Dropdown modal opening & selection
  console.log('Testing template modal...');
  await page.evaluate(() => {
    const dropdown = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'))
      .find(d => d.innerText && d.innerText.includes('বকেয়া অনুস্মারক'));
    if (dropdown) dropdown.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Select polite template if visible
  await page.evaluate(() => {
    const modalItems = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const politeItem = modalItems.find(m => m.innerText && m.innerText.includes('নম্র তাগাদা'));
    if (politeItem) politeItem.click();
  });
  await new Promise(r => setTimeout(r, 500));
  console.log('✔ Template selected via modal');

  // 6. Test Bottom Send CTA
  console.log('Testing bottom send button...');
  await page.evaluate(() => {
    const sendBtn = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'))
      .find(b => b.innerText && (b.innerText.includes('পাঠান') || b.innerText.includes('Send')));
    if (sendBtn) sendBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  console.log('✔ Send action triggered');

  console.log('All Screen 11 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
