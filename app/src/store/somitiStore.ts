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
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;

  // Cash Transfer Action
  transferCash: (fromId: string, toId: string, amount: number) => void;

  // Transaction Lookup
  getTransactionById: (id: string) => Transaction | undefined;

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
      cashAccounts: [...mockCashAccounts],
      expenses: [
        {
          id: 'exp-1',
          title: 'অফিস স্টেশনারি ও খাতা ক্রয়',
          category: 'দাপ্তরিক খরচ',
          amount: 2500,
          date: '৩০ সেপ্টেম্বর ২০২৬',
          paymentSource: 'হাতে নগদ',
          voucherNo: 'V-1021',
          status: 'approved',
        },
        {
          id: 'exp-2',
          title: 'মাসিক সভা ও আপ্যায়ন',
          category: 'আপ্যায়ন',
          amount: 3200,
          date: '২৮ সেপ্টেম্বর ২০২৬',
          paymentSource: 'হাতে নগদ',
          voucherNo: 'V-1019',
          status: 'approved',
        }
      ],
      transactions: [
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
        {
          id: 'tx-1040',
          receiptNo: '#১০৪০',
          memberId: '3',
          memberName: 'জাহিদ হাসান',
          memberCode: 'SM-007',
          date: '২৮ সেপ্টেম্বর ২০২৬',
          amount: 2500,
          type: 'deposit',
          paymentMethod: 'bank',
          note: 'সেপ্টেম্বর মাসের জমা',
          months: ['সেপ্টেম্বর'],
          lateFee: 0,
        }
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

        // Update Somiti Totals
        const updatedSomiti = {
          ...get().somitiInfo,
          totalFund: get().somitiInfo.totalFund + totalAmount,
          cashAndBank: get().somitiInfo.cashAndBank + totalAmount,
          monthlyCollected: get().somitiInfo.monthlyCollected + totalAmount,
          monthlyRemaining: Math.max(0, get().somitiInfo.monthlyRemaining - totalAmount),
          totalDueAmount: Math.max(0, get().somitiInfo.totalDueAmount - totalAmount),
        };

        // Update Cash Accounts
        const updatedCashAccounts = get().cashAccounts.map((acc) => {
          if (paymentMethod === 'bkash' && acc.id === 'bkash') {
            return { ...acc, amount: acc.amount + totalAmount };
          }
          if (paymentMethod === 'bank' && acc.id === 'bank') {
            return { ...acc, amount: acc.amount + totalAmount };
          }
          if (paymentMethod === 'cash' && acc.id === 'cashier') {
            return { ...acc, amount: acc.amount + totalAmount };
          }
          return acc;
        });

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
          paymentMethod: data.paymentSource === 'ব্যাংক' ? 'bank' : 'cash',
          note: `${data.category}: ${data.title}`,
        };

        set({
          expenses: [newExpense, ...get().expenses],
          transactions: [newTxn, ...get().transactions],
          somitiInfo: {
            ...get().somitiInfo,
            totalFund: Math.max(0, get().somitiInfo.totalFund - data.amount),
            cashAndBank: Math.max(0, get().somitiInfo.cashAndBank - data.amount),
            monthlyExpense: get().somitiInfo.monthlyExpense + data.amount,
            monthlyNet: get().somitiInfo.monthlyNet - data.amount,
          }
        });
      },

      // Approvals
      approveRequest: (id) => {
        const currentApprovals = get().approvals;
        const item = currentApprovals.find((a) => a.id === id);
        if (item && item.type === 'expense') {
          // Add to expense
          get().addExpense({
            title: item.title,
            category: 'সাধারণ ব্যয়',
            amount: item.amount,
            paymentSource: 'হাতে নগদ',
            voucherNo: `V-${toBengaliDigits(Math.floor(1000 + Math.random() * 9000))}`,
            note: item.detail,
          });
        }
        set({ approvals: currentApprovals.filter((a) => a.id !== id) });
      },

      rejectRequest: (id) => {
        set({ approvals: get().approvals.filter((a) => a.id !== id) });
      },

      // Transfer cash
      transferCash: (fromId, toId, amount) => {
        set({
          cashAccounts: get().cashAccounts.map((acc) => {
            if (acc.id === fromId) return { ...acc, amount: Math.max(0, acc.amount - amount) };
            if (acc.id === toId) return { ...acc, amount: acc.amount + amount };
            return acc;
          })
        });
      },

      getTransactionById: (id) => {
        return get().transactions.find((t) => t.id === id || t.receiptNo === id || t.receiptNo === `#${id}`);
      },

      resetAllData: () => {
        set({
          somitiInfo: { ...mockSomitiInfo },
          members: [...mockMembers],
          projects: [...mockProjects],
          approvals: [...mockPendingApprovals],
          cashAccounts: [...mockCashAccounts],
          transactions: [],
          expenses: [],
        });
      }
    }),
    {
      name: 'amanot-somiti-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
