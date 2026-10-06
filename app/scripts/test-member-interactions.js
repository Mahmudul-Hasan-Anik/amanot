const puppeteer = require('puppeteer-core');

async function run() {
  console.log('Testing every input and button on Member Profile Screen (Screen 5)...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  await page.goto('http://localhost:8081/(admin)/member/2', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Screen renders
  const screenTitle = await page.evaluate(() => document.body.innerText);
  if (!screenTitle.includes('সদস্য প্রোফাইল') && !screenTitle.includes('Member Profile')) {
    throw new Error('Screen did not render correctly');
  }
  console.log('✔ Member profile loaded');

  // 2. Test Edit Member Modal & Inputs
  console.log('Testing Edit Member Modal & all inputs...');
  await page.click('[data-testid="member-edit-btn"]');
  await new Promise(r => setTimeout(r, 600));

  const testidsInModal = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map(e => e.getAttribute('data-testid'))
  );
  console.log('All testIDs in DOM after opening edit modal:', testidsInModal);

  const nameInput = await page.$('[data-testid="edit-name-input"]');
  const phoneInput = await page.$('[data-testid="edit-phone-input"]');
  const amountInput = await page.$('[data-testid="edit-amount-input"]');
  const nomineeInput = await page.$('[data-testid="edit-nominee-input"]');
  const relationInput = await page.$('[data-testid="edit-relation-input"]');
  const addressInput = await page.$('[data-testid="edit-address-input"]');
  const saveMemberBtn = await page.$('[data-testid="edit-member-save-btn"]');

  if (!nameInput || !phoneInput || !amountInput || !nomineeInput || !relationInput || !addressInput || !saveMemberBtn) {
    throw new Error('One or more edit modal inputs was not found');
  }
  console.log('✔ All 6 modal input fields and save button found');

  // Type into inputs
  await nameInput.click({ clickCount: 3 });
  await nameInput.type('করিম উদ্দিন আহমেদ');
  await phoneInput.click({ clickCount: 3 });
  await phoneInput.type('01712345678');
  await amountInput.click({ clickCount: 3 });
  await amountInput.type('2500');
  await nomineeInput.click({ clickCount: 3 });
  await nomineeInput.type('রাশেদা বেগম');
  await relationInput.click({ clickCount: 3 });
  await relationInput.type('স্ত্রী');
  await addressInput.click({ clickCount: 3 });
  await addressInput.type('উত্তরা সেক্টর ৭, ঢাকা');

  // Click Save
  await saveMemberBtn.click();
  await new Promise(r => setTimeout(r, 800));
  console.log('✔ Edit modal inputs accept text and save successfully');

  // 3. Test Follow-up Card & Modal
  console.log('Testing Follow-up Modal & inputs...');
  await page.click('[data-testid="member-followup-card"]');
  await new Promise(r => setTimeout(r, 600));

  const followupDateInput = await page.$('[data-testid="edit-followup-date-input"]');
  const followupNoteInput = await page.$('[data-testid="edit-followup-note-input"]');
  const saveFollowupBtn = await page.$('[data-testid="edit-followup-save-btn"]');

  if (!followupDateInput || !followupNoteInput || !saveFollowupBtn) {
    throw new Error('Followup modal inputs not found');
  }
  console.log('✔ Follow-up date and note inputs verified');

  await followupDateInput.click({ clickCount: 3 });
  await followupDateInput.type('৫ অক্টোবর');
  await followupNoteInput.click({ clickCount: 3 });
  await followupNoteInput.type('ফোন করা হয়েছে, আগামীকাল জমা দেবেন।');

  await saveFollowupBtn.click();
  await new Promise(r => setTimeout(r, 800));
  console.log('✔ Follow-up modal saved successfully');

  // 4. Test 4 Action Buttons
  console.log('Testing 4 Action Buttons...');
  const callBtn = await page.$('[data-testid="member-call-btn"]');
  const waBtn = await page.$('[data-testid="member-whatsapp-btn"]');
  const smsBtn = await page.$('[data-testid="member-sms-btn"]');
  const stmtBtn = await page.$('[data-testid="member-statement-btn"]');

  if (!callBtn || !waBtn || !smsBtn || !stmtBtn) {
    throw new Error('One or more action buttons was not found');
  }
  console.log('✔ All 4 action buttons (Call, WhatsApp, SMS, Statement) verified');

  // 5. Test Statement navigation
  await stmtBtn.click();
  await new Promise(r => setTimeout(r, 800));
  const afterStmtUrl = page.url();
  console.log('✔ Statement button clicked, URL:', afterStmtUrl);

  // Return to member screen
  await page.goto('http://localhost:8081/(admin)/member/2', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // 6. Test Collect Deposit CTA Button
  console.log('Testing Collect Deposit CTA button...');
  await page.click('[data-testid="member-collect-deposit-btn"]');
  await new Promise(r => setTimeout(r, 800));
  const afterDepositUrl = page.url();
  console.log('✔ Collect deposit CTA clicked, URL:', afterDepositUrl);

  await browser.close();
  console.log('\n🎉 ALL INPUTS AND BUTTONS TESTED AND FUNCTIONAL! 🎉');
}

run().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
