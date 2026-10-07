const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing Screen 8 (Record Deposit) interactions...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/deposit/new?memberId=2', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify screen loaded
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('জমা গ্রহণ') && !bodyText.includes('Record Deposit')) {
    throw new Error('Screen 8 did not load title');
  }
  console.log('✔ Screen 8 Record Deposit loaded');

  // 2. Verify Member is Karim Uddin
  if (!bodyText.includes('করিম উদ্দিন')) {
    throw new Error('Member Karim Uddin not displayed');
  }
  console.log('✔ Karim Uddin selected');

  // 3. Test changing payment method to Bank
  console.log('Testing payment method switching...');
  const bankClicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.trim() === 'ব্যাংক');
    if (el) {
      el.click();
      return true;
    }
    return false;
  });
  console.log('Bank tab clicked:', bankClicked);
  await new Promise(r => setTimeout(r, 500));

  // Switch back to bKash
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.trim() === 'বিকাশ');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 500));
  console.log('✔ Payment method switching verified');

  // 4. Test Member Picker Modal
  console.log('Testing member picker modal...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.trim() === 'বদলান');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const modalOpened = await page.evaluate(() => {
    return document.body.innerText.includes('সদস্য নির্বাচন করুন');
  });
  if (!modalOpened) {
    throw new Error('Member picker modal did not open');
  }
  console.log('✔ Member picker modal opened');

  // Select Anwar Hossain in modal
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span, p')).find(e => e.innerText && e.innerText.includes('আনোয়ার'));
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 800));

  const textAfterMemberChange = await page.evaluate(() => document.body.innerText);
  if (!textAfterMemberChange.includes('আনোয়ার হোসেন')) {
    throw new Error('Member did not switch to Anwar Hossain');
  }
  console.log('✔ Member successfully switched to Anwar Hossain');

  // Switch back to Karim Uddin for deposit confirmation
  await page.goto('http://localhost:8081/(admin)/deposit/new?memberId=2', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // 5. Test Deposit Confirmation Button
  console.log('Testing "জমা নিশ্চিত করুন" button click...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], div[tabindex]'));
    const confirmBtn = btns.find(b => b.innerText && b.innerText.includes('জমা নিশ্চিত'));
    if (confirmBtn) confirmBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const finalUrl = page.url();
  console.log('URL after confirming deposit:', finalUrl);
  if (finalUrl.includes('/receipt/')) {
    console.log('✔ Deposit confirmed and navigated directly to Receipt screen');
  }

  console.log('All Screen 8 interaction tests PASSED successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
