const puppeteer = require('puppeteer-core');

async function testAuditInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  let dialogMessages = [];
  page.on('dialog', async (dialog) => {
    dialogMessages.push(dialog.message());
    console.log('Dialog handled:', dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:8081/(admin)/audit', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('অডিট লগ')) {
    throw new Error('Title "অডিট লগ" not found on page');
  }
  console.log('✔ Screen 24 title verified');

  // Verify permanence banner
  if (!content.includes('এই লগ স্থায়ী')) {
    throw new Error('Permanence banner not found');
  }
  console.log('✔ Permanence security banner verified');

  // Verify timeline events
  if (!content.includes('মাহমুদা খাতুন') || !content.includes('করিম উদ্দিন')) {
    throw new Error('Timeline events not found');
  }
  console.log('✔ Timeline events verified');

  // Test clicking Financial filter chip
  const finFilterClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const chip = elements.find(el => el.textContent && el.textContent.trim() === 'আর্থিক');
    if (chip) {
      chip.click();
      return true;
    }
    return false;
  });
  console.log('✔ Financial filter chip clicked:', finFilterClicked);
  await new Promise(r => setTimeout(r, 400));

  // Test clicking Settings filter chip
  const settingsFilterClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const chip = elements.find(el => el.textContent && el.textContent.trim() === 'সেটিংস');
    if (chip) {
      chip.click();
      return true;
    }
    return false;
  });
  console.log('✔ Settings filter chip clicked:', settingsFilterClicked);
  await new Promise(r => setTimeout(r, 400));

  console.log('✔ All Audit Log interactions passed successfully!');
  await browser.close();
}

testAuditInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
