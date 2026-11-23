const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');

function load(file, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (n) => {
      if (n in deps) return deps[n];
      throw Error('Missing mock: ' + n);
    },
  });
  return exports;
}

const moneyMod = load('src/lib/money.ts');
const bengali = load('src/lib/bengali.ts', { './money': moneyMod });
const domain = load('src/lib/investment.ts', { './bengali': bengali });
const { normalizeContactPhone } = domain;

let openedUrl = '';
let sharedMessage = '';
const mockLinking = {
  openURL: async (url) => {
    openedUrl = url;
  },
};
const mockShare = {
  share: async (opts) => {
    sharedMessage = opts.message;
  },
};

const whatsappUtils = load('src/utils/whatsappReceipt.ts', {
  'react-native': {
    Linking: mockLinking,
    Share: mockShare,
  },
  '../lib/investment': domain,
});

const { passbookReportText, sendOnWhatsApp } = whatsappUtils;

// Test 1: Phone normalization for Bangladeshi numbers
assert.equal(normalizeContactPhone('01860141343'), '8801860141343');
assert.equal(normalizeContactPhone('01712-345678'), '8801712345678');
assert.equal(normalizeContactPhone('8801860141343'), '8801860141343');
assert.equal(normalizeContactPhone('+8801860141343'), '8801860141343');

// Test 2: passbookReportText in Bengali
const moneyFn = (n) => `৳${n.toLocaleString('en-US')}`;
const bnText = passbookReportText(
  {
    society: 'আমানত সমিতি',
    name: 'মো: আইয়ুব',
    code: 'D-2020004',
    phone: '01860141343',
    currentSavings: 23500,
    totalDeposit: 63500,
    totalWithdrawn: 40000,
    profitBalance: 0,
    lines: [
      { date: '১৮ জুন ২০২৬', inAmt: 63500, outAmt: 0, balance: 63500 },
      { date: '১৩ সেপ্টেম্বর ২০২৬', inAmt: 0, outAmt: 30000, balance: 33500 },
      { date: '৩০ অক্টোবর ২০২৬', inAmt: 0, outAmt: 10000, balance: 23500 },
    ],
    isBengali: true,
  },
  moneyFn
);

assert.ok(bnText.includes('*আমানত সমিতি*'), 'Contains society name');
assert.ok(bnText.includes('সদস্য হিসাব বিবরণী (পাসবই)'), 'Contains title');
assert.ok(bnText.includes('মো: আইয়ুব (D-2020004)'), 'Contains member name and code');
assert.ok(bnText.includes('01860141343'), 'Contains phone');
assert.ok(bnText.includes('মোট জমা: ৳63,500'), 'Contains total deposit');
assert.ok(bnText.includes('মোট উত্তোলন: ৳40,000'), 'Contains total withdrawn');
assert.ok(bnText.includes('বর্তমান সঞ্চয়: ৳23,500'), 'Contains current savings');
assert.ok(bnText.includes('১৮ জুন ২০২৬: জমা ৳63,500'), 'Contains first line');
assert.ok(bnText.includes('১৩ সেপ্টেম্বর ২০২৬: উত্তোলন ৳30,000'), 'Contains second line');
assert.ok(bnText.includes('৩০ অক্টোবর ২০২৬: উত্তোলন ৳10,000'), 'Contains third line');
assert.ok(bnText.includes('ধন্যবাদ।'), 'Contains thanks');

// Test 3: sendOnWhatsApp opens correct wa.me link
openedUrl = '';
sendOnWhatsApp('01860141343', bnText);
assert.ok(openedUrl.startsWith('https://wa.me/8801860141343?text='), 'Opens WhatsApp with country code');
assert.ok(decodeURIComponent(openedUrl).includes('মো: আইয়ুব'), 'Encoded message includes member name');

// Test 4: passbookReportText in English
const enText = passbookReportText(
  {
    society: 'Amanot Somiti',
    name: 'Imam Hossain',
    code: 'D-2020001',
    phone: '01700000000',
    currentSavings: 28500,
    lines: [
      { date: '18 June 2026', inAmt: 27500, outAmt: 0, balance: 27500 },
      { date: '4 September 2026', inAmt: 1000, outAmt: 0, balance: 28500 },
    ],
    isBengali: false,
  },
  moneyFn
);

assert.ok(enText.includes('*Amanot Somiti*'));
assert.ok(enText.includes('Member Statement (Passbook)'));
assert.ok(enText.includes('Current Savings: ৳28,500'));
assert.ok(enText.includes('18 June 2026: Deposit ৳27,500'));

console.log('PASS passbook WhatsApp report: formatted summary, breakdown lines, phone normalization, one-click wa.me URL.');
