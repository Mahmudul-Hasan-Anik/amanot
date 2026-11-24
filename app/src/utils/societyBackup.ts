import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { exportFilename } from './exportFilename';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchTransactionHistory } from '../lib/api';
import type { SomitiState, Transaction } from '../store/somitiStore';

export interface SocietyBackupData {
  version: 1;
  app: 'Amanot';
  exportedAt: string;
  somiti: {
    id?: string;
    name: string;
    code?: string;
    phone?: string;
    address?: string;
    fiscalYearStartMonth?: number;
    totalFund?: number;
    cashAndBank?: number;
  };
  members: Array<{
    id: string;
    name: string;
    whatsappNumber: string;
    phone: string;
    whatsapp?: string;
    memberNumber: string;
    code: string;
    category: string;
    address?: string;
    nid?: string;
    totalDeposit: number;
    totalWithdrawn?: number;
    profitBalance?: number;
    joiningDate?: string;
    status?: string;
  }>;
  savings: Array<{
    id: string;
    memberId: string;
    memberName?: string;
    amount: number;
    date: string;
    method: string;
    receiptNo?: string;
    bookReceiptNo?: string;
    note?: string;
  }>;
  investments: Array<{
    id: string;
    recipientName: string;
    name: string;
    principal: number;
    profitPct?: number;
    profitAmount?: number;
    termMonths?: number;
    disbursedDate?: string;
    firstDueDate?: string;
    phone?: string;
    whatsapp?: string;
    returnedAmount?: number;
    remainingAmount?: number;
    status?: string;
    purpose?: string;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    receiptNo?: string;
    bookReceiptNo?: string;
    type: string;
    amount: number;
    paymentMethod: string;
    memberId?: string;
    memberName?: string;
    memberCode?: string;
    projectId?: string;
    note?: string;
    principalPart?: number;
    profitPart?: number;
  }>;
  expenses: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    date?: string;
    paymentSource?: string;
    voucherNo?: string;
  }>;
  cashAccounts: Array<{
    id: string;
    name: string;
    type?: string;
    amount: number;
  }>;
  summary: {
    totalMembers: number;
    totalSavingsRecords: number;
    totalInvestments: number;
    totalTransactions: number;
    totalExpenses: number;
    totalCashAndBank: number;
  };
}

export async function buildSocietyBackup(state: SomitiState): Promise<SocietyBackupData> {
  const remote = isSupabaseConfigured();
  let txs: Transaction[] = state.transactions;
  if (remote) {
    try {
      txs = await fetchTransactionHistory({});
    } catch {
      txs = state.transactions;
    }
  }

  const depositTxs = txs.filter(t => t.type === 'deposit' && !t.voided);

  const backup: SocietyBackupData = {
    version: 1,
    app: 'Amanot',
    exportedAt: new Date().toISOString(),
    somiti: {
      id: (state.somitiInfo as any).id,
      name: state.somitiInfo.name,
      code: (state.somitiInfo as any).code,
      phone: state.somitiInfo.phone,
      address: state.somitiInfo.address,
      fiscalYearStartMonth: Number(state.somitiInfo.fiscalYearStartMonth) || 7,
      totalFund: state.somitiInfo.totalFund,
      cashAndBank: state.somitiInfo.cashAndBank,
    },
    members: state.members.map(m => ({
      id: m.id,
      name: m.name,
      whatsappNumber: m.phone || m.whatsapp || '',
      phone: m.phone,
      whatsapp: m.whatsapp,
      memberNumber: m.code,
      code: m.code,
      category: m.memberCategory || 'general',
      address: m.address,
      nid: m.nid,
      totalDeposit: m.totalDeposit,
      totalWithdrawn: m.totalWithdrawn || 0,
      profitBalance: m.profitBalance || 0,
      joiningDate: m.joinDate,
      status: m.status || 'active',
    })),
    savings: depositTxs.map(t => ({
      id: t.id,
      memberId: t.memberId,
      memberName: t.memberName,
      amount: t.amount,
      date: t.dateISO || t.date,
      method: t.paymentMethod,
      receiptNo: t.receiptNo,
      bookReceiptNo: t.bookReceiptNo,
      note: t.note,
    })),
    investments: state.projects.map(p => ({
      id: p.id,
      recipientName: p.contract?.recipientName || p.name,
      name: p.name,
      principal: p.contract?.principal || p.investedAmount || 0,
      profitPct: p.contract?.profitPct,
      profitAmount: p.contract?.profitAmount,
      termMonths: p.contract?.termMonths,
      disbursedDate: p.contract?.disbursedDate || p.startDate,
      firstDueDate: p.contract?.firstDueDate,
      phone: p.contract?.phone,
      whatsapp: p.contract?.whatsapp,
      returnedAmount: p.returnedAmount || 0,
      remainingAmount: p.remainingAmount !== undefined ? p.remainingAmount : (p.investedAmount || 0),
      status: p.status,
      purpose: p.contract?.purpose,
    })),
    transactions: txs.map(t => ({
      id: t.id,
      date: t.dateISO || t.date,
      receiptNo: t.receiptNo,
      bookReceiptNo: t.bookReceiptNo,
      type: t.type,
      amount: t.amount,
      paymentMethod: t.paymentMethod,
      memberId: t.memberId,
      memberName: t.memberName,
      memberCode: t.memberCode,
      projectId: t.projectId,
      note: t.note,
      principalPart: t.principalPart,
      profitPart: t.profitPart,
    })),
    expenses: state.expenses.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: e.date,
      paymentSource: e.paymentSource,
      voucherNo: e.voucherNo,
    })),
    cashAccounts: state.cashAccounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      amount: a.amount,
    })),
    summary: {
      totalMembers: state.members.length,
      totalSavingsRecords: depositTxs.length,
      totalInvestments: state.projects.length,
      totalTransactions: txs.length,
      totalExpenses: state.expenses.length,
      totalCashAndBank: state.somitiInfo.cashAndBank || 0,
    },
  };

  return backup;
}

export async function exportSocietyBackupJson(state: SomitiState): Promise<{ filename: string; count: number }> {
  const data = await buildSocietyBackup(state);
  const jsonText = JSON.stringify(data, null, 2);
  const filename = exportFilename(['Amanot', state.somitiInfo.name, 'Full-Backup'], 'json');

  if (Platform.OS === 'web') {
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, count: data.members.length };
  }

  if (!FileSystem.cacheDirectory) throw new Error('ফাইল সংরক্ষণের স্থান পাওয়া যায়নি');
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, jsonText, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: filename,
    });
  }

  return { filename, count: data.members.length };
}

export async function exportSocietyBackupCsv(state: SomitiState): Promise<{ filename: string; count: number }> {
  const data = await buildSocietyBackup(state);
  const filename = exportFilename(['Amanot', state.somitiInfo.name, 'All-Data'], 'csv');

  const cell = (val: unknown) => {
    let s = String(val ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };

  const sections: string[] = [];

  // Somiti Overview
  sections.push(['সমিতির নাম', 'সদস্য সংখ্যা', 'মোট সঞ্চয় এন্ট্রি', 'মোট বিনিয়োগ', 'মোট লেনদেন', 'হাতে ও ব্যাংকে'].map(cell).join(','));
  sections.push([
    data.somiti.name,
    data.summary.totalMembers,
    data.summary.totalSavingsRecords,
    data.summary.totalInvestments,
    data.summary.totalTransactions,
    data.summary.totalCashAndBank,
  ].map(cell).join(','));
  sections.push('');

  // Members
  sections.push('[সদস্য তালিকা]');
  sections.push(['আইডি', 'নাম', 'মোবাইল', 'ক্যাটাগরি', 'বর্তমান সঞ্চয়', 'মোট উত্তোলন', 'মুনাফা ব্যালেন্স', 'যোগদানের তারিখ'].map(cell).join(','));
  for (const m of data.members) {
    sections.push([m.code, m.name, m.phone, m.category, m.totalDeposit, m.totalWithdrawn, m.profitBalance, m.joiningDate].map(cell).join(','));
  }
  sections.push('');

  // Transactions
  sections.push('[সকল লেনদেনের তালিকা]');
  sections.push(['তারিখ', 'রসিদ নং', 'ধরন', 'বিবরণ / নাম', 'পরিমাণ', 'মাধ্যম', 'সদস্য/চুক্তি আইডি'].map(cell).join(','));
  for (const t of data.transactions) {
    sections.push([t.date, t.bookReceiptNo || t.receiptNo, t.type, t.note || t.memberName, t.amount, t.paymentMethod, t.memberCode || t.memberId || ''].map(cell).join(','));
  }

  const csvText = '\ufeff' + sections.join('\r\n');

  if (Platform.OS === 'web') {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, count: data.transactions.length };
  }

  if (!FileSystem.cacheDirectory) throw new Error('ফাইল সংরক্ষণের স্থান পাওয়া যায়নি');
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csvText, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      dialogTitle: filename,
    });
  }

  return { filename, count: data.transactions.length };
}
