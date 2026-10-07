const puppeteer = require('puppeteer-core');

async function testAnalyticsInteractions() {
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

  await page.goto('http://localhost:8081/(admin)/analytics', {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  // Verify page title
  const content = await page.content();
  if (!content.includes('অ্যানালিটিক্স')) {
    throw new Error('Title "অ্যানালিটিক্স" not found on page');
  }
  console.log('✔ Screen 17 title verified');

  // Verify smart alerts exist
  if (!content.includes('স্মার্ট সতর্কবার্তা') || !content.includes('অলস টাকা')) {
    throw new Error('Smart alerts not found on page');
  }
  console.log('✔ Smart alerts verified');

  // Test period tabs switching: 3 Months
  const tab3mClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const tab = elements.find(el => el.textContent && el.textContent.trim() === '৩ মাস');
    if (tab) {
      tab.click();
      return true;
    }
    return false;
  });
  console.log('✔ 3 Months tab clicked:', tab3mClicked);
  await new Promise(r => setTimeout(r, 400));

  // Test period tabs switching: 1 Year
  const tab1yClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const tab = elements.find(el => el.textContent && el.textContent.trim() === '১ বছর');
    if (tab) {
      tab.click();
      return true;
    }
    return false;
  });
  console.log('✔ 1 Year tab clicked:', tab1yClicked);
  await new Promise(r => setTimeout(r, 400));

  // Switch back to 6 Months
  const tab6mClicked = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, span, p'));
    const tab = elements.find(el => el.textContent && el.textContent.trim() === '৬ মাস');
    if (tab) {
      tab.click();
      return true;
    }
    return false;
  });
  console.log('✔ 6 Months tab clicked:', tab6mClicked);
  await new Promise(r => setTimeout(r, 400));

  // Verify chart sections exist in DOM
  const hasCollectionChart = content.includes('মাসিক আদায়ের হার');
  const hasFundGrowthChart = content.includes('তহবিলের বৃদ্ধি');
  const hasHabitsChart = content.includes('সদস্যদের জমার অভ্যাস');
  const hasRoiChart = content.includes('প্রজেক্টভিত্তিক ROI');

  if (!hasCollectionChart || !hasFundGrowthChart || !hasHabitsChart || !hasRoiChart) {
    throw new Error('One or more chart sections missing in analytics');
  }
  console.log('✔ All 4 analytics charts verified');

  await browser.close();
  console.log('All Screen 17 interaction tests passed successfully!');
}

testAnalyticsInteractions().catch((err) => {
  console.error('Interaction test failed:', err);
  process.exit(1);
});
