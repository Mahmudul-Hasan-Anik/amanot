const puppeteer = require('puppeteer-core');
const path = require('path');

const OUT_DIR = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/screenshots/phase_b';

async function testDobAndFocus() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  console.log('1. Navigating to New Member screen...');
  await page.goto('http://localhost:8081/(admin)/member/new', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // Test 1: Check focus outline on an input
  console.log('2. Testing focus style on input...');
  const nameInput = await page.$('[data-testid="input-member-name"]');
  if (nameInput) {
    await nameInput.focus();
    const style = await page.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        borderColor: computed.borderColor
      };
    }, nameInput);
    console.log('Focused input computed style:', style);
    if (style.outlineStyle === 'none' || style.outlineWidth === '0px') {
      console.log('PASS: No black or colored browser focus outline on input!');
    } else {
      console.error('FAIL: Input still has focus outline:', style);
    }
  }

  // Test 2: Click the Date of Birth calendar button
  console.log('3. Clicking Date of Birth calendar button...');
  const dobCalendarBtn = await page.$('[data-testid="btn-dob-calendar"]');
  if (dobCalendarBtn) {
    await dobCalendarBtn.click();
    console.log('Clicked [data-testid="btn-dob-calendar"]!');
  } else {
    console.error('FAIL: Calendar button not found!');
  }

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-dob-picker.png') });
  console.log('Saved screen-06-dob-picker.png');

  // Verify modal opened
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes('জন্মতারিখ নির্বাচন করুন') || bodyText.includes('Select Date of Birth')) {
    console.log('PASS: DatePicker modal opened successfully!');
  } else {
    console.error('FAIL: DatePicker modal text not found in body!');
  }

  // Click on Day 20, Month March (৩), Year 1992
  console.log('4. Selecting Day, Month, Year...');
  await page.evaluate(() => {
    // Click Day 20
    const allPills = Array.from(document.querySelectorAll('div[role="button"], div[tabindex="0"]'));
    const day20 = allPills.find(el => el.innerText && (el.innerText.trim() === '২০' || el.innerText.trim() === '20'));
    if (day20) day20.click();

    // Click Month 3 (মার্চ / March)
    const march = allPills.find(el => el.innerText && (el.innerText.includes('মার্চ') || el.innerText.includes('March')));
    if (march) march.click();

    // Click Year 1992 (১৯৯২)
    const yr = allPills.find(el => el.innerText && (el.innerText.trim() === '১৯৯২' || el.innerText.trim() === '1992'));
    if (yr) yr.click();
  });

  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-dob-selected.png') });
  console.log('Saved screen-06-dob-selected.png');

  // Click Confirm Date
  console.log('5. Clicking Confirm Date button...');
  const confirmBtn = await page.$('[data-testid="btn-confirm-datepicker"]');
  if (confirmBtn) {
    await confirmBtn.click();
    console.log('Clicked [data-testid="btn-confirm-datepicker"]!');
  }

  await new Promise(r => setTimeout(r, 1000));
  const dobVal = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="input-member-dob"]');
    return el ? el.value : '';
  });
  console.log(`Date of Birth field value after confirm: "${dobVal}"`);

  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-dob-confirmed.png') });
  console.log('Saved screen-06-dob-confirmed.png');

  await browser.close();
}

testDobAndFocus().catch(console.error);
