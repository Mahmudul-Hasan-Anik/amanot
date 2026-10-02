import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Member,
  Project,
  PendingApproval,
  CashAccount,
  mockMembers,
  mockProjects,
  mockPendingApprovals,
  mockApprovedApprovals,
  mockRejectedApprovals,
  mockCashAccounts,
  mockSomitiInfo,
} from '../mocks/mockData';
import { toBengaliDigits } from '../lib/bengali';

export interface Transaction {
  id: string;
  receiptNo: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  date: string;
  amount: number;
  type: 'deposit' | 'expense' | 'transfer' | 'profit' | 'loan';
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
  trxId?: string;
  note?: string;
  months?: string[];
  lateFee?: number;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentSource: string;
  voucherNo: string;
  note?: string;
  status: 'approved' | 'pending';
}

export interface SomitiState {
  // Master data
  somitiInfo: typeof mockSomitiInfo;
  members: Member[];
  projects: Project[];
  approvals: PendingApproval[];
  approvedApprovals: PendingApproval[];
  rejectedApprovals: PendingApproval[];
  cashAccounts: CashAccount[];
  transactions: Transaction[];
  expenses: ExpenseItem[];

  // Members Actions
  addMember: (data: {
    name: string;
    phone: string;
    nid?: string;
    address: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineePhone?: string;
    monthlyAmount: number;
    admissionFee?: number;
  }) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  getMemberById: (id: string) => Member | undefined;

  // Deposit & Collection Actions
  recordDeposit: (data: {
    memberId: string;
    months: string[];
    baseAmount: number;
    lateFee: number;
    totalAmount: number;
    paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
    trxId?: string;
    note?: string;
    sendWhatsApp?: boolean;
    sendSMS?: boolean;
  }) => Transaction;

  // Expense Actions
  addExpense: (data: {
    title: string;
    category: string;
    amount: number;
    paymentSource: string;
    voucherNo: string;
    note?: string;
  }) => void;

  // Approvals Actions
  approveRequest: (id: string, actor?: string) => void;
  rejectRequest: (id: string, reason?: string, actor?: string) => void;

  // Cash Transfer Action
  transferCash: (fromId: string, toId: string, amount: number, note?: string) => boolean;

  // Transaction Lookup
  getTransactionById: (id: string) => Transaction | undefined;

  // Somiti Info Action
  updateSomitiInfo: (data: Partial<typeof mockSomitiInfo>) => void;

  // Reset helper
  resetAllData: () => void;
}

export const useSomitiStore = create<SomitiState>()(
  persist(
    (set, get) => ({
      somitiInfo: { ...mockSomitiInfo },
      members: [...mockMembers],
      projects: [...mockProjects],
      approvals: [...mockPendingApprovals],
      approvedApprovals: [...mockApprovedApprovals],
      rejectedApprovals: [...mockRejectedApprovals],
      cashAccounts: [...mockCashAccounts],
      expenses: [
        {
          id: 'exp-1',
          title: 'বার্ষিক সভার দুপুরের খাবার ও নাস্তা',
          category: 'সভা ও আপ্যায়ন',
          amount: 5200,
          date: '৩০ সেপ্টেম্বর ২০২৬',
          paymentSource: 'হাতে নগদ',
          voucherNo: 'V-1021',
          status: 'approved',
        },
        {
          id: 'exp-2',
          title: 'সভার যাতায়াত ও পরিদর্শন খরচ',
          category: 'যাতায়াত',
          amount: 3100,
          date: '২০ সেপ্টেম্বর ২০২৬',
          paymentSource: 'হাতে নগদ',
          voucherNo: 'V-1019',
          status: 'approved',
        },
        {
          id: 'exp-3',
          title: 'অফিস বিবিধ খরচ',
          category: 'অন্যান্য',
          amount: 1800,
          date: '২২ সেপ্টেম্বর ২০২৬',
          paymentSource: 'হাতে নগদ',
          voucherNo: 'V-1018',
          status: 'approved',
        },
        {
          id: 'exp-4',
          title: 'এসএমএস প্যাকেজ রিচার্জ',
          category: 'এসএমএস ও অ্যাপ',
          amount: 1500,
          date: '২৮ সেপ্টেম্বর ২০২৬',
          paymentSource: 'বিকাশ',
          voucherNo: 'V-1015',
          status: 'approved',
        },
        {
          id: 'exp-5',
          title: 'অফিস রেজিস্টার খাতা ও কলম ক্রয়',
          category: 'স্টেশনারি',
          amount: 1200,
          date: '১৫ সেপ্টেম্বর ২০২৬',
          paymentSource: 'হাতে নগদ',
          voucherNo: 'V-1012',
          status: 'approved',
        }
      ],
      transactions: [
        {
          id: 'tx-recent-1',
          receiptNo: '#V-1015',
          memberId: 'org',
          memberName: 'এসএমএস প্যাকেজ',
          memberCode: 'EXP',
          date: '২৮ সেপ্টে',
          amount: 1500,
          type: 'expense',
          paymentMethod: 'bkash',
          note: 'এসএমএস প্যাকেজ রিচার্জ',
        },
        {
          id: 'tx-recent-2',
          receiptNo: '#INC-204',
          memberId: 'proj-p3',
          memberName: 'পোল্ট্রি খামার',
          memberCode: 'INC',
          date: '২৫ সেপ্টে',
          amount: 18400,
          type: 'profit',
          paymentMethod: 'bank',
          note: 'পোল্ট্রি খামার প্রজেক্ট লাভ',
        },
        {
          id: 'tx-recent-3',
          receiptNo: '#V-1019',
          memberId: 'org',
          memberName: 'সভার যাতায়াত',
          memberCode: 'EXP',
          date: '২০ সেপ্টে',
          amount: 1200,
          type: 'expense',
          paymentMethod: 'cash',
          note: 'সভার যাতায়াত খরচ',
        },
        {
          id: 'tx-1042',
          receiptNo: '#১০৪২',
          memberId: '2',
          memberName: 'করিম উদ্দিন',
          memberCode: 'SM-042',
          date: '৩০ সেপ্টেম্বর ২০২৬',
          amount: 4100,
          type: 'deposit',
          paymentMethod: 'bkash',
          trxId: 'BK7X29QM4L',
          note: 'আগস্ট ও সেপ্টেম্বর মাসের কিস্তি + বিলম্ব ফি',
          months: ['আগস্ট', 'সেপ্টেম্বর'],
          lateFee: 100,
        },
        {
          id: 'tx-1041',
          receiptNo: '#১০৪১',
          memberId: '1',
          memberName: 'আনোয়ার হোসেন',
          memberCode: 'SM-001',
          date: '২৯ সেপ্টেম্বর ২০২৬',
          amount: 3000,
          type: 'deposit',
          paymentMethod: 'cash',
          note: 'সেপ্টেম্বর মাসের জমা',
          months: ['সেপ্টেম্বর'],
          lateFee: 0,
        },
      ],

      // Members
      getMemberById: (id: string) => {
        return get().members.find((m) => m.id === id);
      },

      addMember: (data) => {
        const currentMembers = get().members;
        const nextCodeNum = currentMembers.length + 1;
        const codeNumStr = nextCodeNum < 10 ? `00${nextCodeNum}` : nextCodeNum < 100 ? `0${nextCodeNum}` : `${nextCodeNum}`;
        const newCode = `SM-${codeNumStr}`;
        const newId = String(Date.now());

        const newMember: Member = {
          id: newId,
          code: newCode,
          name: data.name,
          phone: data.phone,
          whatsapp: data.phone,
          nid: data.nid || '',
          address: data.address,
          nomineeName: data.nomineeName,
          nomineeRelation: data.nomineeRelation,
          nomineePhone: data.nomineePhone || '',
          joinDate: '১ অক্টোবর ২০২৬',
          monthlyAmount: data.monthlyAmount,
          totalDeposit: data.admissionFee || 0,
          dueAmount: 0,
          dueMonths: 0,
          status: 'paid',
          role: 'সাধারণ সদস্য',
          monthsStatus: {
            0: 'paid', 1: 'paid', 2: 'paid', 3: 'paid', 4: 'paid', 5: 'paid', 6: 'paid', 7: 'paid', 8: 'paid', 9: 'upcoming', 10: 'upcoming', 11: 'upcoming'
          },
          recentTxns: data.admissionFee ? [
            {
              date: '১ অক্টোবর',
              title: 'ভর্তি ফি ও প্রাথমিক জমা',
              amount: data.admissionFee,
              receiptNo: `#${toBengaliDigits(1000 + currentMembers.length + 1)}`,
              type: 'হাতে নগদ'
            }
          ] : []
        };

        const updatedMembers = [newMember, ...currentMembers];
        const updatedSomiti = {
          ...get().somitiInfo,
          totalMembersCount: get().somitiInfo.totalMembersCount + 1,
          activeMembersCount: get().somitiInfo.activeMembersCount + 1,
          totalFund: get().somitiInfo.totalFund + (data.admissionFee || 0),
          cashAndBank: get().somitiInfo.cashAndBank + (data.admissionFee || 0),
        };

        set({ members: updatedMembers, somitiInfo: updatedSomiti });
        return newMember;
      },

      updateMember: (id, updatedFields) => {
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, ...updatedFields } : m))
        });
      },

      deleteMember: (id) => {
        set({
          members: get().members.filter((m) => m.id !== id),
          somitiInfo: {
            ...get().somitiInfo,
            totalMembersCount: Math.max(0, get().somitiInfo.totalMembersCount - 1),
          }
        });
      },

      // Deposit
      recordDeposit: (data) => {
        const { memberId, totalAmount, paymentMethod, trxId, note, months, lateFee } = data;
        const currentMembers = get().members;
        const member = currentMembers.find((m) => m.id === memberId);
        const receiptNumber = `#${toBengaliDigits(1043 + get().transactions.length)}`;
        const txnId = `tx-${Date.now()}`;

        const newTxn: Transaction = {
          id: txnId,
          receiptNo: receiptNumber,
          memberId,
          memberName: member?.name || 'সদস্য',
          memberCode: member?.code || 'SM-000',
          date: '২ অক্টোবর ২০২৬',
          amount: totalAmount,
          type: 'deposit',
          paymentMethod,
          trxId,
          note: note || `${months.join(', ')} মাসের কিস্তি`,
          months,
          lateFee,
        };

        // Update Member
        const updatedMembers = currentMembers.map((m) => {
          if (m.id === memberId) {
            const newTotalDeposit = m.totalDeposit + totalAmount;
            const newDueAmount = Math.max(0, m.dueAmount - totalAmount);
            const newDueMonths = Math.max(0, m.dueMonths - months.length);
            const newStatus: 'paid' | 'due' | 'partial' | 'inactive' = newDueAmount === 0 ? 'paid' : 'due';
            const updatedTxns = [
              {
                date: '২ অক্টোবর',
                title: `${months.join(', ')} জমা`,
                amount: totalAmount,
                receiptNo: receiptNumber,
                type: paymentMethod === 'bkash' ? 'বিকাশ' : paymentMethod === 'nagad' ? 'নগদ' : paymentMethod === 'bank' ? 'ব্যাংক' : 'হাতে নগদ',
              },
              ...(m.recentTxns || []),
            ];

            return {
              ...m,
              totalDeposit: newTotalDeposit,
              dueAmount: newDueAmount,
              dueMonths: newDueMonths,
              status: newStatus,
              recentTxns: updatedTxns,
            };
          }
          return m;
        });

        // Update Cash Accounts
        const updatedCashAccounts = get().cashAccounts.map((acc) => {
          if (paymentMethod === 'bkash' && (acc.type === 'bkash' || acc.id === 'ca3' || acc.id === 'bkash')) {
            return { ...acc, amount: acc.amount + totalAmount };
          }
          if (paymentMethod === 'bank' && (acc.type === 'bank' || acc.id === 'ca1' || acc.id === 'bank')) {
            return { ...acc, amount: acc.amount + totalAmount };
          }
          if (paymentMethod === 'cash' && (acc.type === 'cashier' || acc.id === 'ca2' || acc.id === 'cashier')) {
            return { ...acc, amount: acc.amount + totalAmount };
          }
          return acc;
        });

        const newCashAndBank = updatedCashAccounts.reduce((sum, a) => sum + a.amount, 0);
        const projectInvested = get().projects.reduce((sum, p) => sum + (p.investedAmount || 0), 0) || get().somitiInfo.projectInvested;

        // Update Somiti Totals
        const updatedSomiti = {
          ...get().somitiInfo,
          cashAndBank: newCashAndBank,
          totalFund: projectInvested + newCashAndBank,
          monthlyCollected: get().somitiInfo.monthlyCollected + totalAmount,
          monthlyRemaining: Math.max(0, get().somitiInfo.monthlyRemaining - totalAmount),
          totalDueAmount: Math.max(0, get().somitiInfo.totalDueAmount - totalAmount),
        };

        set({
          members: updatedMembers,
          transactions: [newTxn, ...get().transactions],
          somitiInfo: updatedSomiti,
          cashAccounts: updatedCashAccounts,
        });

        return newTxn;
      },

      // Expense
      addExpense: (data) => {
        const newExpense: ExpenseItem = {
          id: `exp-${Date.now()}`,
          title: data.title,
          category: data.category,
          amount: data.amount,
          date: '২ অক্টোবর ২০২৬',
          paymentSource: data.paymentSource,
          voucherNo: data.voucherNo,
          note: data.note,
          status: 'approved',
        };

        const newTxn: Transaction = {
          id: `tx-${Date.now()}`,
          receiptNo: data.voucherNo,
          memberId: 'org',
          memberName: 'সমিতি খরচ',
          memberCode: 'EXP',
          date: '২ অক্টোবর ২০২৬',
          amount: data.amount,
          type: 'expense',
          paymentMethod: data.paymentSource?.toLowerCase().includes('ব্যাংক') ? 'bank' : data.paymentSource?.toLowerCase().includes('বিকাশ') ? 'bkash' : 'cash',
          note: `${data.category}: ${data.title}`,
        };

        const sourceStr = (data.paymentSource || '').toLowerCase();
        const updatedCashAccounts = get().cashAccounts.map((acc) => {
          const isMatch =
            (sourceStr.includes('ব্যাংক') || sourceStr.includes('bank')) ? (acc.type === 'bank' || acc.id === 'ca1') :
            (sourceStr.includes('বিকাশ') || sourceStr.includes('bkash')) ? (acc.type === 'bkash' || acc.id === 'ca3') :
            (acc.type === 'cashier' || acc.id === 'ca2');
          if (isMatch) {
            return { ...acc, amount: Math.max(0, acc.amount - data.amount) };
          }
          return acc;
        });

        const newCashAndBank = updatedCashAccounts.reduce((sum, a) => sum + a.amount, 0);
        const projectInvested = get().projects.reduce((sum, p) => sum + (p.investedAmount || 0), 0) || get().somitiInfo.projectInvested;

        set({
          expenses: [newExpense, ...get().expenses],
          transactions: [newTxn, ...get().transactions],
          cashAccounts: updatedCashAccounts,
          somitiInfo: {
            ...get().somitiInfo,
            cashAndBank: newCashAndBank,
            totalFund: projectInvested + newCashAndBank,
            monthlyExpense: get().somitiInfo.monthlyExpense + data.amount,
            monthlyNet: get().somitiInfo.monthlyNet - data.amount,
          }
        });
      },

      // Approvals
      approveRequest: (id, actor) => {
        const currentApprovals = get().approvals;
        const item = currentApprovals.find((a) => a.id === id);
        if (item) {
          if (item.type === 'expense' || item.type === 'investment') {
            // Add to expense
            get().addExpense({
              title: item.title,
              category: item.type === 'investment' ? 'প্রজেক্ট বিনিয়োগ' : 'সাধারণ ব্যয়',
              amount: item.amount,
              paymentSource: item.type === 'investment' ? 'ব্যাংক' : 'হাতে নগদ',
              voucherNo: `V-${toBengaliDigits(Math.floor(1000 + Math.random() * 9000))}`,
              note: item.detail,
            });
          }

          const approvedItem: PendingApproval = {
            ...item,
            status: 'approved',
            approvedAt: 'আজ ১০:৪৫',
            approvedBy: actor || 'আনোয়ার হোসেন (সভাপতি)',
          };

          set({
            approvals: currentApprovals.filter((a) => a.id !== id),
            approvedApprovals: [approvedItem, ...(get().approvedApprovals || [])],
          });
        }
      },

      rejectRequest: (id, reason, actor) => {
        const currentApprovals = get().approvals;
        const item = currentApprovals.find((a) => a.id === id);
        if (item) {
          const rejectedItem: PendingApproval = {
            ...item,
            status: 'rejected',
            rejectedAt: 'আজ ১০:৪৫',
            rejectedBy: actor || 'আনোয়ার হোসেন (সভাপতি)',
            rejectionReason: reason || 'অপ্রয়োজনীয় বা অস্পষ্ট ভাউচার',
          };

          set({
            approvals: currentApprovals.filter((a) => a.id !== id),
            rejectedApprovals: [rejectedItem, ...(get().rejectedApprovals || [])],
          });
        }
      },

      // Transfer cash
      transferCash: (fromId, toId, amount, note) => {
        const fromAcc = get().cashAccounts.find((a) => a.id === fromId);
        const toAcc = get().cashAccounts.find((a) => a.id === toId);
        if (!fromAcc || !toAcc || fromAcc.amount < amount) return false;

        const updatedCashAccounts = get().cashAccounts.map((acc) => {
          if (acc.id === fromId) return { ...acc, amount: Math.max(0, acc.amount - amount) };
          if (acc.id === toId) return { ...acc, amount: acc.amount + amount };
          return acc;
        });

        const newTxn: Transaction = {
          id: `tx-tf-${Date.now()}`,
          receiptNo: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
          memberId: 'internal',
          memberName: 'হিসাব স্থানান্তর',
          memberCode: 'TRF',
          date: '২ অক্টোবর ২০২৬',
          amount: amount,
          type: 'transfer',
          paymentMethod: 'cash',
          note: note || `${fromAcc.name} থেকে ${toAcc.name}-এ স্থানান্তর`,
        };

        set({
          cashAccounts: updatedCashAccounts,
          transactions: [newTxn, ...get().transactions],
        });
        return true;
      },

      getTransactionById: (id) => {
        return get().transactions.find((t) => t.id === id || t.receiptNo === id || t.receiptNo === `#${id}`);
      },

      updateSomitiInfo: (data) => {
        set({
          somitiInfo: {
            ...get().somitiInfo,
            ...data,
          }
        });
      },

      resetAllData: () => {
        set({
          somitiInfo: { ...mockSomitiInfo },
          members: [...mockMembers],
          projects: [...mockProjects],
          approvals: [...mockPendingApprovals],
          approvedApprovals: [...mockApprovedApprovals],
          rejectedApprovals: [...mockRejectedApprovals],
          cashAccounts: [...mockCashAccounts],
          transactions: [],
          expenses: [],
        });
      }
    }),
    {
      name: 'amanot-somiti-storage',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        if (version < 2 || persistedState?.somitiInfo?.name === 'আমানত') {
          persistedState.somitiInfo = {
            ...persistedState.somitiInfo,
            name: 'উত্তরা মডেল সমবায় সমিতি',
            nameEn: 'Uttara Model Samity',
          };
        }
        if (version < 3) {
          persistedState.cashAccounts = [
            { id: 'ca1', type: 'bank', name: 'ব্যাংক হিসাব', holder: 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)', amount: 760000 },
            { id: 'ca2', type: 'cashier', name: 'কোষাধ্যক্ষের হাতে', holder: 'মাহমুদা খাতুন', amount: 120000 },
            { id: 'ca3', type: 'bkash', name: 'বিকাশ', holder: '০১৭১১-২২৩৩৪৪', amount: 38000 },
            { id: 'ca4', type: 'field', name: 'মাঠকর্মীর হাতে', holder: 'সুমন মিয়া', amount: 12000, note: 'আজ জমা দিতে হবে' },
          ];
          const cashTotal = 930000;
          const projTotal = 3920000;
          persistedState.somitiInfo = {
            ...persistedState.somitiInfo,
            cashAndBank: cashTotal,
            projectInvested: projTotal,
            totalFund: cashTotal + projTotal,
            monthlyIncome: 182400,
            monthlyExpense: 12800,
            monthlyNet: 169600,
          };
        }
        return persistedState;
      },
    }
  )
);
