const puppeteer = require('puppeteer-core');
const path = require('path');

const OUT_DIR = 'C:/Users/Hasan/.gemini/antigravity/brain/d598c0e9-6775-4372-986a-d9ee5f031cce/scratch/screenshots/phase_b';

async function setInputValue(page, testId, value) {
  await page.evaluate((id, val) => {
    const input = document.querySelector(`[data-testid="${id}"]`);
    if (input) {
      input.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.error(`Input not found: ${id}`);
    }
  }, testId, value);
}

async function testInteractions() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  page.on('dialog', async dialog => {
    console.log('Dialog popped:', dialog.message());
    await dialog.accept();
  });

  console.log('1. Navigating to New Member screen...');
  await page.goto('http://localhost:8081/(admin)/member/new', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Entering Full Name...');
  await setInputValue(page, 'input-member-name', 'মোঃ রফিকুল ইসলাম');

  console.log('3. Entering Phone...');
  await setInputValue(page, 'input-member-phone', '1712345678');

  console.log('4. Entering Address...');
  await setInputValue(page, 'input-member-address', 'হাউজ ১২, রোড ৫, বনানী, ঢাকা');

  console.log('5. Entering Nominee Name...');
  await setInputValue(page, 'input-nominee-name', 'সালমা বেগম');

  console.log('6. Entering Nominee Relation...');
  await setInputValue(page, 'input-nominee-relation', 'স্ত্রী');

  console.log('7. Entering Nominee Phone...');
  await setInputValue(page, 'input-nominee-phone', '01812345678');

  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-filled.png') });
  console.log('Saved screen-06-filled.png');

  // Submit button
  console.log('8. Clicking Submit button...');
  const submitBtn = await page.$('[data-testid="submit-new-member-btn"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('Clicked [data-testid="submit-new-member-btn"]!');
  } else {
    console.error('Submit button not found!');
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-success-modal.png') });
  console.log('Saved screen-06-success-modal.png');

  const modalText = await page.evaluate(() => document.body.innerText);
  if (modalText.includes('সদস্য যোগ সফল হয়েছে')) {
    console.log('SUCCESS: Modal verified with text "সদস্য যোগ সফল হয়েছে!"');
  } else {
    console.log('WARNING: Modal text not found');
  }

  // Click on "সদস্য তালিকায় যান"
  const doneBtn = await page.$('[data-testid="modal-go-to-members-btn"]');
  if (doneBtn) {
    await doneBtn.click();
    console.log('Clicked [data-testid="modal-go-to-members-btn"]!');
  }

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'screen-06-navigated-back.png') });
  console.log('Saved screen-06-navigated-back.png');

  await browser.close();
}

testInteractions().catch(console.error);
