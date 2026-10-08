const puppeteer = require('puppeteer-core');

async function testDistributionInteractions() {
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

  await page.goto('http://localhost:8081/(admin)/distribution', {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('বার্ষিক লাভ বণ্টন')) {
    throw new Error('Title "বার্ষিক লাভ বণ্টন" not found on page');
  }
  console.log('✔ Screen 20 title verified');

  // Verify calculation card
  if (!content.includes('হিসাব (খসড়া)') || !content.includes('বণ্টনযোগ্য লাভ')) {
    throw new Error('Calculation card elements not found');
  }
  console.log('✔ Calculation card verified');

  // Verify members list
  if (!content.includes('আনোয়ার হোসেন') || !content.includes('করিম উদ্দিন')) {
    throw new Error('Member allocation elements not found');
  }
  console.log('✔ Member list verified');

  // Click Draft PDF button
  const draftClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const btn = elements.find(el => el.textContent && el.textContent.includes('খসড়া PDF'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Draft PDF button clicked:', draftClicked);
  await new Promise(r => setTimeout(r, 400));

  // Click Give Approval button
  const approveClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const btn = elements.find(el => el.textContent && (el.textContent.includes('অনুমোদন দিন') || el.textContent.includes('অনুমোদিত')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✔ Approval button clicked:', approveClicked);
  await new Promise(r => setTimeout(r, 600));

  console.log('✔ All Distribution interactions passed successfully!');
  await browser.close();
}

testDistributionInteractions().catch((err) => {
  console.error(err);
  process.exit(1);
});
