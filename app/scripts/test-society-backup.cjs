const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadModule(relPath, mocks = {}) {
  const fullPath = path.join(__dirname, '..', relPath);
  const src = fs.readFileSync(fullPath, 'utf8');
  const code = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const modExports = {};
  const context = {
    exports: modExports,
    require: (m) => {
      if (m in mocks) return mocks[m];
      if (m.endsWith('/exportFilename')) return { exportFilename: (p, ext) => `Amanot_Backup_test.${ext}` };
      if (m.endsWith('/lib/supabase')) return { isSupabaseConfigured: () => false };
      if (m.endsWith('/lib/api')) return { fetchTransactionHistory: async () => [] };
      if (m === 'react-native') return { Platform: { OS: 'web' } };
      if (m === 'expo-sharing') return { isAvailableAsync: async () => true, shareAsync: async () => {} };
      if (m === 'expo-file-system/legacy') return { cacheDirectory: '/cache/', writeAsStringAsync: async () => {} };
      try {
        return require(m);
      } catch {
        return {};
      }
    },
  };
  vm.runInNewContext(code, context);
  return modExports;
}

const backupMod = loadModule('src/utils/societyBackup.ts');

async function testBackupBundle() {
  const mockState = {
    somitiInfo: {
      id: 'somiti-1',
      name: 'আমানত সঞ্চয় ও ঋণদান সমবায় সমিতি',
      code: 'AMN-01',
      phone: '01700000000',
      address: 'ঢাকা, বাংলাদেশ',
      fiscalYearStartMonth: 7,
      totalFund: 500000,
      cashAndBank: 150000,
    },
    members: [
      {
        id: 'm1',
        name: 'মো: আইয়ুব',
        phone: '01860141343',
        whatsapp: '01860141343',
        code: 'D-2020004',
        memberCategory: 'director',
        address: 'মিরপুর, ঢাকা',
        nid: '1234567890',
        totalDeposit: 23500,
        totalWithdrawn: 40000,
        profitBalance: 0,
        joinedDate: '2020-01-01',
        status: 'active',
      },
      {
        id: 'm2',
        name: 'হাবিবুল বারী',
        phone: '01711111111',
        code: 'D-2020023',
        memberCategory: 'director',
        totalDeposit: 15000,
        totalWithdrawn: 0,
        profitBalance: 1200,
        status: 'active',
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'নোমান',
        investedAmount: 50000,
        returnedAmount: 12000,
        remainingAmount: 38000,
        status: 'ongoing',
        contract: {
          number: 'INV-1022',
          recipientName: 'নোমান',
          principal: 50000,
          profitPct: 10,
          profitAmount: 5000,
          termMonths: 10,
          disbursedDate: '2026-10-01',
          firstDueDate: '2026-11-01',
          phone: '01822222222',
          purpose: 'ব্যবসা সম্প্রসারণ',
        },
      },
    ],
    transactions: [
      {
        id: 't1',
        date: '2026-10-01',
        dateISO: '2026-10-01',
        receiptNo: '1001',
        bookReceiptNo: '1001',
        type: 'deposit',
        amount: 2000,
        paymentMethod: 'cash',
        memberId: 'm1',
        memberName: 'মো: আইয়ুব',
        memberCode: 'D-2020004',
        note: 'মাসিক চাঁদা',
      },
      {
        id: 't2',
        date: '2026-10-02',
        dateISO: '2026-10-02',
        receiptNo: '2001',
        bookReceiptNo: '2001',
        type: 'profit',
        amount: 5500,
        paymentMethod: 'cash',
        projectId: 'p1',
        memberName: 'নোমান',
        note: 'কিস্তি আদায়',
        principalPart: 5000,
        profitPart: 500,
      },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'অফিস স্টেশনারি',
        category: 'অফিস খরচ',
        amount: 1500,
        date: '2026-10-05',
        paymentSource: 'হাতে নগদ',
        voucherNo: 'V-001',
      },
    ],
    cashAccounts: [
      { id: 'c1', name: 'হাতে নগদ (কোষাধ্যক্ষ)', type: 'cashier', amount: 50000 },
      { id: 'c2', name: 'ব্যাংক হিসাব', type: 'bank', amount: 100000 },
    ],
  };

  const backup = await backupMod.buildSocietyBackup(mockState);

  // 1. Version & Structure
  assert.equal(backup.version, 1, 'Backup version must be 1');
  assert.equal(backup.app, 'Amanot');
  assert.equal(backup.somiti.name, 'আমানত সঞ্চয় ও ঋণদান সমবায় সমিতি');
  assert.ok(backup.exportedAt);

  // 2. Members & SomitiPro compatibility
  assert.equal(backup.members.length, 2);
  assert.equal(backup.members[0].name, 'মো: আইয়ুব');
  assert.equal(backup.members[0].whatsappNumber, '01860141343');
  assert.equal(backup.members[0].code, 'D-2020004');
  assert.equal(backup.members[0].category, 'director');

  // 3. Savings
  assert.equal(backup.savings.length, 1);
  assert.equal(backup.savings[0].amount, 2000);
  assert.equal(backup.savings[0].memberId, 'm1');

  // 4. Investments
  assert.equal(backup.investments.length, 1);
  assert.equal(backup.investments[0].recipientName, 'নোমান');
  assert.equal(backup.investments[0].principal, 50000);

  // 5. Transactions, Expenses & Accounts
  assert.equal(backup.transactions.length, 2);
  assert.equal(backup.expenses.length, 1);
  assert.equal(backup.cashAccounts.length, 2);

  // 6. Summary checks
  assert.equal(backup.summary.totalMembers, 2);
  assert.equal(backup.summary.totalSavingsRecords, 1);
  assert.equal(backup.summary.totalInvestments, 1);
  assert.equal(backup.summary.totalTransactions, 2);
  assert.equal(backup.summary.totalExpenses, 1);

  // 7. JSON serialization roundtrip
  const serialized = JSON.stringify(backup);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.members.length, 2);
  assert.equal(parsed.savings.length, 1);

  console.log('PASS society backup: complete schema, SomitiPro import compatibility, full transactions, investments, expenses and cash accounts.');
}

testBackupBundle().catch((e) => {
  console.error(e);
  process.exit(1);
});
