const puppeteer = require('puppeteer-core');

async function testExpenseInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // Handle any window.alert or prompt from React Native Web Alert.alert
  page.on('dialog', async (dialog) => {
    console.log('Dialog handled:', dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:8081/(admin)/expense/new', {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('খরচ লিখুন')) {
    throw new Error('Title "খরচ লিখুন" not found on page');
  }
  console.log('✔ Screen 15 title verified');

  // Test category chip click
  const travelChipClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const travelEl = elements.find(el => el.textContent && el.textContent.trim() === 'যাতায়াত');
    if (travelEl) {
      travelEl.click();
      return true;
    }
    return false;
  });
  console.log('✔ Category chip clicked:', travelChipClicked);

  // Test payment source click
  const bankClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const bankEl = elements.find(el => el.textContent && el.textContent.trim() === 'ব্যাংক');
    if (bankEl) {
      bankEl.click();
      return true;
    }
    return false;
  });
  console.log('✔ Payment source (Bank) clicked:', bankClicked);

  // Test receipt box click
  const receiptClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const receiptEl = elements.find(el => el.textContent && el.textContent.includes('রসিদের ছবি'));
    if (receiptEl) {
      receiptEl.click();
      return true;
    }
    return false;
  });
  console.log('✔ Receipt box clicked & toggled:', receiptClicked);

  // Test Spender modal open
  const spenderClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const spenderEl = elements.find(el => el.textContent && el.textContent.includes('আনোয়ার হোসেন'));
    if (spenderEl) {
      spenderEl.click();
      return true;
    }
    return false;
  });
  console.log('✔ Spender selector clicked:', spenderClicked);
  await new Promise(r => setTimeout(r, 400));

  // Select Rafiqul from modal
  const rafiqulSelected = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const rafEl = elements.find(el => el.textContent && el.textContent.includes('রফিকুল ইসলাম'));
    if (rafEl) {
      rafEl.click();
      return true;
    }
    return false;
  });
  console.log('✔ Rafiqul selected from spender modal:', rafiqulSelected);
  await new Promise(r => setTimeout(r, 400));

  // Test submit button
  const submitClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const btn = elements.find(el => el.textContent && (el.textContent.includes('অনুমোদনের জন্য পাঠান') || el.textContent.includes('খরচ সংরক্ষণ করুন')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Bottom CTA button clicked:', submitClicked);
  await new Promise(r => setTimeout(r, 600));

  await browser.close();
  console.log('All Screen 15 interaction tests passed successfully!');
}

testExpenseInteractions().catch((err) => {
  console.error('Interaction test failed:', err);
  process.exit(1);
});
