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
import { Alert } from 'react-native';
import { isSupabaseConfigured } from '../lib/supabase';
import * as api from '../lib/api';

/** true = real Supabase backend, false = local demo data */
export const REMOTE = isSupabaseConfigured();

const emptySomitiInfo: typeof mockSomitiInfo = {
  ...mockSomitiInfo,
  name: 'আমানত সমিতি', regNo: '', establishedYear: '', address: '', phone: '', email: '', authority: '',
  committeeTenure: '', bankName: '', bankAccountNo: '', bkashNo: '', nagadNo: '',
  totalMembersCount: 0, activeMembersCount: 0, dueMembersCount: 0, inactiveMembersCount: 0,
  totalFund: 0, monthlyFundGrowth: 0, projectInvested: 0, projectInvestedPct: 0, cashAndBank: 0, cashAndBankPct: 0,
  monthlyTarget: 0, monthlyCollected: 0, monthlyCollectedPct: 0, monthlyRemaining: 0, paidCount: 0, dueCount: 0,
  partialCount: 0, unpaidCount: 0, totalDueAmount: 0, dueBreakdown: { month1: 0, month2: 0, month3Plus: 0 },
  monthlyIncome: 0, monthlyExpense: 0, monthlyNet: 0, yearlyProjectProfit: 0,
};

/**
 * Write-through to the server: the UI is already updated optimistically;
 * on success we re-sync (server is the source of truth), on failure we show
 * the error and re-sync to roll back.
 */
function remote(label: string, call: () => Promise<any>) {
  if (!REMOTE) return;
  call()
    .then(() => useSomitiStore.getState().syncFromServer())
    .catch((e: any) => {
      Alert.alert('সংরক্ষণ ব্যর্থ', `${label}: ${e?.message || e}`);
      useSomitiStore.getState().syncFromServer();
    });
}

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

export interface Notice {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface SomitiState {
  notices: Notice[];
  auditLogs: AuditLog[];
  addNotice: (title: string, body: string) => void;
  deleteNotice: (id: string) => void;
  setMemberRole: (memberId: string, role: string, title?: string) => void;
  addProject: (data: { name: string; type: string; location?: string; manager?: string; investedAmount: number; startDate?: string; expectedEnd?: string; paymentSource?: 'bank' | 'cash' | 'bkash' }) => void;

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
    code?: string;
    nid?: string;
    address: string;
    nomineeName: string;
    nomineeRelation: string;
    nomineePhone?: string;
    monthlyAmount: number;
    admissionFee?: number;
    initialPin?: string;
    joinDate?: string; // YYYY-MM-DD
    whatsapp?: string;
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
    status?: 'approved' | 'pending';
  }) => void;

  // Approvals Actions
  approveRequest: (id: string, actor?: string) => void;
  rejectRequest: (id: string, reason?: string, actor?: string) => void;

  // Project Actions
  recordProjectReturn: (data: {
    projectId: string;
    amount: number;
    paymentSource: string;
    note?: string;
  }) => void;

  // Cash Transfer Action
  transferCash: (fromId: string, toId: string, amount: number, note?: string) => boolean;

  // Transaction Lookup
  getTransactionById: (id: string) => Transaction | undefined;

  // Somiti Info Action
  updateSomitiInfo: (data: Partial<typeof mockSomitiInfo>) => void;

  // Reset helper
  resetAllData: () => void;

  // Backend sync
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  syncFromServer: () => Promise<void>;
  clearLocalData: () => void;
}

export const useSomitiStore = create<SomitiState>()(
  persist(
    (set, get) => ({
      isSyncing: false,
      lastSyncedAt: null,
      notices: [],
      auditLogs: [],

      addNotice: (title, body) => {
        const n = { id: api.uuid(), title, body, createdBy: '', createdAt: new Date().toISOString() };
        set({ notices: [n, ...get().notices] });
        remote('নোটিশ', () => api.addNotice(title, body));
      },

      deleteNotice: (id) => {
        set({ notices: get().notices.filter((n) => n.id !== id) });
        remote('নোটিশ মুছুন', () => api.deleteNotice(id));
      },

      setMemberRole: (memberId, role, title) => {
        set({
          members: get().members.map((m) =>
            m.id === memberId ? ({ ...m, role: title || m.role, appRole: role } as any) : m
          ),
        });
        remote('রোল পরিবর্তন', () => api.setMemberRole(memberId, role, title));
      },

      addProject: (data) => {
        const p: Project = {
          id: api.uuid(),
          name: data.name,
          type: data.type,
          location: data.location || '',
          manager: data.manager || '',
          status: 'ongoing',
          investedAmount: data.investedAmount,
          returnedAmount: 0,
          netProfit: 0,
          roiPct: 0,
          startDate: data.startDate || '',
          expectedEnd: data.expectedEnd || '',
          recoveryPct: 0,
          remainingAmount: data.investedAmount,
        };
        set({ projects: [...get().projects, p] });
        remote('প্রজেক্ট', () => api.upsertProject({ ...data, id: p.id }));
      },
      syncError: null,
      somitiInfo: REMOTE ? { ...emptySomitiInfo } : { ...mockSomitiInfo },
      members: REMOTE ? [] : [...mockMembers],
      projects: REMOTE ? [] : [...mockProjects],
      approvals: REMOTE ? [] : [...mockPendingApprovals],
      approvedApprovals: REMOTE ? [] : [...mockApprovedApprovals],
      rejectedApprovals: REMOTE ? [] : [...mockRejectedApprovals],
      cashAccounts: REMOTE ? [] : [...mockCashAccounts],
      expenses: REMOTE ? [] : [
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
      transactions: REMOTE ? [] : [
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
        const newCode = data.code?.trim() || `SM-${codeNumStr}`;
        const newId = REMOTE ? api.uuid() : String(Date.now());

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

        if (REMOTE) {
          remote('সদস্য যোগ', () => api.addMember({ ...data, id: newId, code: data.code?.trim() || undefined }));
          return newMember;
        }

        if (data.initialPin) {
          try {
            const { useAuthStore } = require('../features/auth/authStore');
            useAuthStore.getState().setMemberPin(newId, data.initialPin);
          } catch (e) {}
        }

        return newMember;
      },

      updateMember: (id, updatedFields) => {
        set({
          members: get().members.map((m) => (m.id === id ? { ...m, ...updatedFields } : m))
        });
        remote('সদস্য হালনাগাদ', () => api.updateMember(id, updatedFields as any));
      },

      deleteMember: (id) => {
        set({
          members: get().members.filter((m) => m.id !== id),
          somitiInfo: {
            ...get().somitiInfo,
            totalMembersCount: Math.max(0, get().somitiInfo.totalMembersCount - 1),
          }
        });
        remote('সদস্য মুছুন', () => api.deleteMember(id));
      },

      // Deposit
      recordDeposit: (data) => {
        const { memberId, totalAmount, paymentMethod, trxId, note, months, lateFee } = data;
        const currentMembers = get().members;
        const member = currentMembers.find((m) => m.id === memberId);
        const receiptNumber = `#${toBengaliDigits(1043 + get().transactions.length)}`;
        const txnId = REMOTE ? api.uuid() : `tx-${Date.now()}`;

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

        remote('জমা', () =>
          api.recordDeposit({
            id: txnId,
            memberId,
            months,
            baseAmount: data.baseAmount,
            lateFee,
            totalAmount,
            paymentMethod,
            trxId,
            note,
          })
        );

        return newTxn;
      },

      // Expense
      addExpense: (data) => {
        remote('খরচ', () => api.addExpense(data));
        const isPending = data.status === 'pending';
        const newExpense: ExpenseItem = {
          id: `exp-${Date.now()}`,
          title: data.title,
          category: data.category,
          amount: data.amount,
          date: '২ অক্টোবর ২০২৬',
          paymentSource: data.paymentSource,
          voucherNo: data.voucherNo,
          note: data.note,
          status: isPending ? 'pending' : 'approved',
        };

        if (isPending) {
          const newApproval: PendingApproval = {
            id: `appr-${Date.now()}`,
            type: 'expense',
            title: data.title,
            amount: data.amount,
            amountDisplay: `৳${toBengaliDigits(data.amount)}`,
            detail: `${data.category} · ভাউচার: ${data.voucherNo}${data.note ? ' · ' + data.note : ''}`,
            createdBy: 'সাধারণ সম্পাদক / হিসাবরক্ষক',
            dateStr: 'আজ ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
            isNew: true,
            status: 'pending',
          };

          set({
            expenses: [newExpense, ...get().expenses],
            approvals: [newApproval, ...get().approvals],
          });
          return;
        }

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
        if (item && REMOTE) {
          set({
            approvals: currentApprovals.filter((a) => a.id !== id),
            approvedApprovals: [{ ...item, status: 'approved', approvedBy: actor }, ...(get().approvedApprovals || [])],
          });
          remote('অনুমোদন', () => api.approveRequest(id));
          return;
        }
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
          remote('প্রত্যাখ্যান', () => api.rejectRequest(id, reason));
        }
      },

      recordProjectReturn: (data) => {
        const target = get().projects.find((p) => p.id === data.projectId);
        if (!target) return;

        const newReturned = target.returnedAmount + data.amount;
        const newRemaining = Math.max(0, target.investedAmount - newReturned);
        const newRecoveryPct = Math.min(100, Math.round((newReturned / target.investedAmount) * 100));
        const newNetProfit = newReturned - target.investedAmount;
        const newRoi = target.investedAmount > 0 ? Math.round((newNetProfit / target.investedAmount) * 100) : 0;

        const updatedProjects = get().projects.map((p) => {
          if (p.id === data.projectId) {
            return {
              ...p,
              returnedAmount: newReturned,
              remainingAmount: newRemaining,
              recoveryPct: newRecoveryPct,
              netProfit: newNetProfit,
              roiPct: newRoi,
            };
          }
          return p;
        });

        const newTxn: Transaction = {
          id: `tx-${Date.now()}`,
          receiptNo: `RET-${Math.floor(1000 + Math.random() * 9000)}`,
          memberId: target.id,
          memberName: target.name,
          memberCode: 'PRJ',
          date: '২ অক্টোবর ২০২৬',
          amount: data.amount,
          type: 'profit',
          paymentMethod: data.paymentSource.toLowerCase().includes('ব্যাংক') ? 'bank' : 'cash',
          note: `${target.name}: ${data.note || 'প্রজেক্ট আয় / ফেরত'}`,
        };

        const isBank = data.paymentSource.toLowerCase().includes('ব্যাংক') || data.paymentSource.toLowerCase().includes('bank');
        const updatedCashAccounts = get().cashAccounts.map((acc) => {
          if (isBank && (acc.type === 'bank' || acc.id === 'ca1')) {
            return { ...acc, amount: acc.amount + data.amount };
          }
          if (!isBank && (acc.type === 'cashier' || acc.id === 'ca2')) {
            return { ...acc, amount: acc.amount + data.amount };
          }
          return acc;
        });

        const newCashAndBank = updatedCashAccounts.reduce((sum, a) => sum + a.amount, 0);
        const projectInvested = updatedProjects.reduce((sum, p) => sum + (p.investedAmount || 0), 0);

        set({
          projects: updatedProjects,
          transactions: [newTxn, ...get().transactions],
          cashAccounts: updatedCashAccounts,
          somitiInfo: {
            ...get().somitiInfo,
            cashAndBank: newCashAndBank,
            totalFund: projectInvested + newCashAndBank,
            yearlyProjectProfit: (get().somitiInfo.yearlyProjectProfit || 0) + data.amount,
          },
        });
        remote('প্রজেক্ট আয়', () => api.recordProjectReturn(data));
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
        remote('স্থানান্তর', () => api.transferCash(fromId, toId, amount, note));
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
        remote('সমিতির তথ্য', () => api.updateSomitiInfo(data as any));
      },

      resetAllData: () => {
        if (REMOTE) {
          // never wipe real data from the app — just reload from the server
          get().syncFromServer();
          return;
        }
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
      },

      syncFromServer: async () => {
        if (!REMOTE) return;
        set({ isSyncing: true });
        try {
          const { useAuthStore } = require('../features/auth/authStore');
          const isStaff = useAuthStore.getState().actualRole !== 'member';
          const data = await api.fetchAll(isStaff);
          set({
            ...data,
            somitiInfo: { ...emptySomitiInfo, ...data.somitiInfo },
            isSyncing: false,
            lastSyncedAt: Date.now(),
            syncError: null,
          });
        } catch (e: any) {
          set({ isSyncing: false, syncError: e?.message || String(e) });
        }
      },

      clearLocalData: () => {
        if (!REMOTE) return;
        set({
          somitiInfo: { ...emptySomitiInfo },
          members: [],
          projects: [],
          approvals: [],
          approvedApprovals: [],
          rejectedApprovals: [],
          cashAccounts: [],
          transactions: [],
          expenses: [],
          lastSyncedAt: null,
        });
      },
    }),
    {
      name: REMOTE ? 'amanot-somiti-cache' : 'amanot-somiti-storage',
      partialize: (state) => {
        const { isSyncing, syncError, ...rest } = state as any;
        return rest;
      },
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        if (version < 4 || persistedState?.somitiInfo?.name?.includes('উত্তরা') || !persistedState?.somitiInfo?.name) {
          persistedState.somitiInfo = {
            ...persistedState.somitiInfo,
            name: 'আমানত সমিতি',
            nameEn: 'Amanot Samity',
            tagline: 'সমিতির সব হিসাব, এক জায়গায়',
          };
        }
        if (version < 3) {
          persistedState.cashAccounts = [
            { id: 'ca1', type: 'bank', name: 'ব্যাংক হিসাব', holder: 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)', amount: 760000 },
            { id: 'ca2', type: 'cashier', name: 'কোষাধ্যক্ষের হাতে', holder: 'মাহমুদা খাতুন', amount: 120000 },
            { id: 'ca3', type: 'bkash', name: 'বিকাশ', holder: '০১৭১২-৩৪৫৬৭৮', amount: 38000 },
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
