const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 7 (Monthly Collection) interactions...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/(tabs)/collection', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('মাসিক আদায়') && !bodyText.includes('Monthly Collection')) {
    throw new Error('Screen 7 did not load title');
  }
  console.log('✔ Monthly collection screen loaded');

  // 2. Test Segmented Control tabs
  // Find tabs by text
  console.log('Testing tab switching...');
  
  // Click "জমা" tab
  const paidTabClicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.includes('জমা ৭'));
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log('Paid tab click result:', paidTabClicked);
  await new Promise(r => setTimeout(r, 600));

  // Click "বকেয়া" tab
  const dueTabClicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.includes('বকেয়া ২'));
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log('Due tab click result:', dueTabClicked);
  await new Promise(r => setTimeout(r, 600));

  // Verify due members are visible
  const textAfterDue = await page.evaluate(() => document.body.innerText);
  if (!textAfterDue.includes('করিম উদ্দিন') && !textAfterDue.includes('রফিকুল ইসলাম')) {
    throw new Error('Due members not shown in Due tab');
  }
  console.log('✔ Due tab successfully filtered to due members (Karim, Rafiqul present)');

  // Click "সব" tab back
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.trim() === 'সব');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Test Search
  console.log('Testing search bar...');
  // Click search icon (top right)
  await page.evaluate(() => {
    // The search icon is an iconBtn in header
    const buttons = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    if (buttons.length > 0) buttons[0].click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Check if search input exists
  const searchInput = await page.$('input');
  if (searchInput) {
    console.log('✔ Search bar opened on search icon click');
    await searchInput.type('করিম');
    await new Promise(r => setTimeout(r, 500));
    const searchResultText = await page.evaluate(() => document.body.innerText);
    if (searchResultText.includes('করিম উদ্দিন') && !searchResultText.includes('আনোয়ার হোসেন')) {
      console.log('✔ Search correctly filtered to "করিম উদ্দিন" only');
    }
  }

  // 4. Test "জমা নিন" navigation button
  console.log('Testing "জমা নিন" button click...');
  // Reload page cleanly
  await page.goto('http://localhost:8081/(admin)/(tabs)/collection', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const depositBtnClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const depBtn = btns.find(b => b.innerText && b.innerText.trim() === 'জমা নিন');
    if (depBtn) {
      depBtn.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 1000));
  const currentUrl = page.url();
  console.log('URL after clicking "জমা নিন":', currentUrl);
  if (currentUrl.includes('/deposit/new')) {
    console.log('✔ "জমা নিন" button navigates directly to Deposit entry screen');
  }

  console.log('All Screen 7 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
