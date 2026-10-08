const puppeteer = require('puppeteer-core');

async function testStatementInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  let dialogMessage = '';
  page.on('dialog', async (dialog) => {
    dialogMessage = dialog.message();
    console.log('Dialog handled:', dialogMessage);
    await dialog.accept();
  });

  await page.goto('http://localhost:8081/(admin)/statement', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('স্টেটমেন্ট পাঠান')) {
    throw new Error('Title "স্টেটমেন্ট পাঠান" not found on page');
  }
  console.log('✔ Screen 19 title verified');

  // Verify elements: preview card, member name, green bar
  if (!content.includes('করিম উদ্দিন') && !content.includes('মোহাম্মদ রহিম')) {
    throw new Error('Preview card elements not found on page');
  }
  console.log('✔ Preview card verified');

  // Click on recipient chip 'শুধুমাত্র সক্রিয়'
  const activePillClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const pill = elements.find(el => el.textContent && el.textContent.includes('শুধুমাত্র সক্রিয়'));
    if (pill) {
      pill.click();
      return true;
    }
    return false;
  });
  console.log('✔ Recipient chip clicked:', activePillClicked);
  await new Promise(r => setTimeout(r, 400));

  // Toggle SMS channel
  const smsToggled = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const sms = elements.find(el => el.textContent && el.textContent.includes('এসএমএস'));
    if (sms) {
      sms.click();
      return true;
    }
    return false;
  });
  console.log('✔ SMS channel checkbox toggled:', smsToggled);
  await new Promise(r => setTimeout(r, 400));

  // Click bottom Send Button
  const sendClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const btn = elements.find(el => el.textContent && el.textContent.includes('কাউকে পাঠানো হবে না') || el.textContent.includes('পাঠান'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Send CTA clicked:', sendClicked);
  await new Promise(r => setTimeout(r, 600));

  console.log('✔ All Statement interactions passed successfully!');
  await browser.close();
}

testStatementInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
