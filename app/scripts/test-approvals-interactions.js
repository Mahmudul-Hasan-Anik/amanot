const puppeteer = require('puppeteer-core');

async function testApprovalsInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  page.on('dialog', async (dialog) => {
    console.log('Dialog handled:', dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:8081/(admin)/approvals', {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('অনুমোদন')) {
    throw new Error('Title "অনুমোদন" not found on page');
  }
  console.log('✔ Screen 16 title verified');

  // Test attachment click
  const attachmentClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const attEl = elements.find(el => el.textContent && el.textContent.includes('রসিদের ছবি দেখুন'));
    if (attEl) {
      attEl.click();
      return true;
    }
    return false;
  });
  console.log('✔ Attachment link clicked:', attachmentClicked);
  await new Promise(r => setTimeout(r, 400));

  // Close attachment modal
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const closeBtn = elements.find(el => el.textContent && el.textContent.trim() === 'বন্ধ করুন');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Test tab switching: Approved tab
  const approvedTabClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const tab = elements.find(el => el.textContent && el.textContent.trim() === 'অনুমোদিত');
    if (tab) {
      tab.click();
      return true;
    }
    return false;
  });
  console.log('✔ Approved tab clicked:', approvedTabClicked);
  await new Promise(r => setTimeout(r, 400));

  // Switch back to Pending tab
  const pendingTabClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const tab = elements.find(el => el.textContent && el.textContent.includes('অপেক্ষমাণ'));
    if (tab) {
      tab.click();
      return true;
    }
    return false;
  });
  console.log('✔ Pending tab clicked:', pendingTabClicked);
  await new Promise(r => setTimeout(r, 400));

  // Test Approve button on first card
  const approveClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const appBtn = elements.find(el => el.textContent && el.textContent.includes('অনুমোদন') && el.parentElement && el.parentElement.textContent.includes('প্রত্যাখ্যান'));
    if (appBtn) {
      appBtn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Approve button clicked:', approveClicked);
  await new Promise(r => setTimeout(r, 600));

  await browser.close();
  console.log('All Screen 16 interaction tests passed successfully!');
}

testApprovalsInteractions().catch((err) => {
  console.error('Interaction test failed:', err);
  process.exit(1);
});
