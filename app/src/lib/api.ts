/**
 * Supabase data layer for Amanot.
 * Maps database rows to the shapes the UI (somitiStore) already uses,
 * and wraps every server-side RPC.
 */
import { supabase, phoneToEmail, pinToPassword, normalizePhone } from './supabase';
import { BENGALI_MONTHS_FULL } from './bengali';
import { toBengaliDigits } from './money';
import type { Member, Project, PendingApproval, CashAccount } from '../mocks/mockData';
import type { Transaction, ExpenseItem } from '../store/somitiStore';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function uuid(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const num = (v: any) => (v === null || v === undefined ? 0 : Number(v));

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return isNaN(dt.getTime()) ? null : dt;
}

/** "2026-09-30" -> "৩০ সেপ্টেম্বর ২০২৬" */
export function bnDate(d?: string | null, withYear = true): string {
  const dt = parseDate(d);
  if (!dt) return '';
  const base = `${toBengaliDigits(dt.getDate())} ${BENGALI_MONTHS_FULL[dt.getMonth()]}`;
  return withYear ? `${base} ${toBengaliDigits(dt.getFullYear())}` : base;
}

/** "2022-01-01" -> "জানুয়ারি ২০২২" */
function bnMonthYear(d?: string | null): string {
  const dt = parseDate(d);
  return dt ? `${BENGALI_MONTHS_FULL[dt.getMonth()]} ${toBengaliDigits(dt.getFullYear())}` : '';
}

/** created_at -> "আজ ১০:২০" / "গতকাল" / "৩০ সেপ্টেম্বর" */
function bnRelative(ts?: string | null): string {
  const dt = parseDate(ts);
  if (!dt) return '';
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const t = dt.getTime();
  const hh = toBengaliDigits(String(dt.getHours()).padStart(2, '0'));
  const mm = toBengaliDigits(String(dt.getMinutes()).padStart(2, '0'));
  if (t >= startToday) return `আজ ${hh}:${mm}`;
  if (t >= startToday - 86400000) return 'গতকাল';
  return bnDate(ts, false);
}

const METHOD_LABEL: Record<string, string> = {
  bkash: 'বিকাশ',
  nagad: 'নগদ',
  bank: 'ব্যাংক',
  cash: 'হাতে নগদ',
};

function unwrap<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw new Error(res.error.message || 'সার্ভার ত্রুটি');
  return res.data as T;
}

// ---------------------------------------------------------------------------
// mappers
// ---------------------------------------------------------------------------

const MEMBER_COLUMNS =
  'id,user_id,code,name,name_en,phone,whatsapp,nid,address,nominee_name,nominee_name_en,nominee_relation,' +
  'nominee_phone,join_date,monthly_amount,total_deposit,due_amount,due_months,status,role_title,app_role,' +
  'profit_2025,estimated_profit_2026,months_status,next_followup,partial_credit';

export function mapTransaction(r: any): Transaction {
  return {
    id: r.id,
    receiptNo: r.receipt_no,
    memberId: r.member_id || r.project_id || (r.type === 'transfer' ? 'internal' : 'org'),
    memberName: r.party_name,
    memberCode: r.party_code,
    date: bnDate(r.date),
    amount: num(r.amount),
    type: r.type,
    paymentMethod: r.payment_method,
    trxId: r.trx_id || undefined,
    note: r.note || undefined,
    months: r.months || undefined,
    lateFee: num(r.late_fee),
    ...({ dateISO: r.date, createdAt: r.created_at } as any),
  };
}

export function mapMember(r: any, txns: any[] = []): Member {
  const own = txns.filter((t) => t.member_id === r.id).slice(0, 10);
  // server keeps this up to date (refresh_member_dues): 'paid' | 'due', anything else = not due yet
  const monthsStatus: Record<number, 'paid' | 'due' | 'upcoming'> = {};
  for (let i = 0; i < 12; i++) {
    const v = r.months_status?.[String(i)];
    monthsStatus[i] = v === 'paid' || v === 'due' ? v : 'upcoming';
  }
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    nameEn: r.name_en || undefined,
    phone: r.phone,
    whatsapp: r.whatsapp || r.phone,
    nid: r.nid || '',
    address: r.address || '',
    nomineeName: r.nominee_name || '',
    nomineeNameEn: r.nominee_name_en || undefined,
    nomineeRelation: r.nominee_relation || '',
    nomineePhone: r.nominee_phone || '',
    joinDate: bnMonthYear(r.join_date),
    monthlyAmount: num(r.monthly_amount),
    totalDeposit: num(r.total_deposit),
    dueAmount: num(r.due_amount),
    dueMonths: num(r.due_months),
    status: r.status,
    role: r.role_title || 'সাধারণ সদস্য',
    profit2025: num(r.profit_2025),
    estimatedProfit2026: num(r.estimated_profit_2026),
    monthsStatus,
    recentTxns: own.map((t) => ({
      date: bnDate(t.date, false),
      title: t.months?.length ? `${t.months.join(', ')} জমা` : t.note || 'জমা',
      amount: num(t.amount),
      receiptNo: t.receipt_no,
      type: METHOD_LABEL[t.payment_method] || t.payment_method,
    })),
    nextFollowup: r.next_followup || undefined,
    // extra (not in the Member type, used by auth)
    ...({
      appRole: r.app_role,
      userId: r.user_id,
      joinDateISO: r.join_date,
      partialCredit: num(r.partial_credit),
    } as any),
  };
}

function mapProject(r: any): Project {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    location: r.location || '',
    manager: r.manager || '',
    status: r.status,
    investedAmount: num(r.invested_amount),
    returnedAmount: num(r.returned_amount),
    netProfit: num(r.net_profit),
    roiPct: num(r.roi_pct),
    startDate: r.start_date || '',
    expectedEnd: r.expected_end || '',
    recoveryPct: num(r.recovery_pct),
    remainingAmount: num(r.remaining_amount),
  };
}

function mapCash(r: any): CashAccount {
  return { id: r.id, type: r.type, name: r.name, holder: r.holder || '', amount: num(r.amount), note: r.note || undefined };
}

function mapExpense(r: any): ExpenseItem {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    amount: num(r.amount),
    date: bnDate(r.date),
    paymentSource: r.payment_source,
    voucherNo: r.voucher_no,
    note: r.note || undefined,
    status: r.status === 'approved' ? 'approved' : 'pending',
    ...({ dateISO: r.date } as any),
  };
}

function mapApproval(r: any): PendingApproval {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    amount: num(r.amount),
    amountDisplay: r.amount_display || `৳${toBengaliDigits(num(r.amount))}`,
    detail: r.detail,
    createdBy: r.created_by_name,
    dateStr: bnRelative(r.created_at),
    isNew: Date.now() - new Date(r.created_at).getTime() < 86400000,
    attachmentType: r.attachment_type || undefined,
    attachmentTitle: r.attachment_title || undefined,
    status: r.status,
    approvedAt: r.status === 'approved' ? bnRelative(r.decided_at) : undefined,
    approvedBy: r.status === 'approved' ? r.decided_by_name : undefined,
    rejectedAt: r.status === 'rejected' ? bnRelative(r.decided_at) : undefined,
    rejectedBy: r.status === 'rejected' ? r.decided_by_name : undefined,
    rejectionReason: r.rejection_reason || undefined,
  };
}

// ---------------------------------------------------------------------------
// reads
// ---------------------------------------------------------------------------

export async function fetchAll(isStaff: boolean) {
  const q = <T,>(p: PromiseLike<{ data: T | null; error: any }>) => p.then(unwrap);
  const empty = Promise.resolve([] as any[]);

  // bring every member's due status up to today before reading (cheap, server-side)
  if (isStaff) {
    await supabase.rpc('refresh_dues').then(() => {}, () => {});
  }

  const [settings, summary, members, projects, cash, txns, expenses, approvals, notices, audit] = await Promise.all([
    q(supabase.from('somiti_settings').select('info').eq('id', 1).maybeSingle()),
    q(supabase.rpc('get_somiti_summary')),
    q(supabase.from('members').select(MEMBER_COLUMNS).is('deleted_at', null).order('code')),
    q(supabase.from('projects').select('*').order('created_at')),
    isStaff ? q(supabase.from('cash_accounts').select('*').order('sort')) : empty,
    q(supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(1000)),
    isStaff ? q(supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(500)) : empty,
    isStaff ? q(supabase.from('approvals').select('*').order('created_at', { ascending: false }).limit(300)) : empty,
    Promise.resolve(q(supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(50))).catch(() => []),
    isStaff
      ? Promise.resolve(q(supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(300))).catch(() => [])
      : empty,
  ]);

  const txRows = (txns as any[]) || [];
  const apRows = (approvals as any[]) || [];
  return {
    somitiInfo: { ...((settings as any)?.info || {}), ...((summary as any) || {}) },
    members: ((members as any[]) || []).map((m) => mapMember(m, txRows)),
    projects: ((projects as any[]) || []).map(mapProject),
    cashAccounts: ((cash as any[]) || []).map(mapCash),
    transactions: txRows.map(mapTransaction),
    expenses: ((expenses as any[]) || []).filter((e) => e.status !== 'rejected').map(mapExpense),
    approvals: apRows.filter((a) => a.status === 'pending').map(mapApproval),
    approvedApprovals: apRows.filter((a) => a.status === 'approved').map(mapApproval),
    rejectedApprovals: apRows.filter((a) => a.status === 'rejected').map(mapApproval),
    notices: ((notices as any[]) || []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdBy: n.created_by_name || '',
      createdAt: n.created_at,
    })),
    auditLogs: ((audit as any[]) || []).map((a) => ({
      id: String(a.id),
      action: a.action as string,
      actor: a.actor_name || '',
      details: a.details || {},
      createdAt: a.created_at as string,
    })),
  };
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

export async function checkPhone(phone: string): Promise<{ exists: boolean; registered: boolean; initial?: string }> {
  return unwrap(await supabase.rpc('check_phone', { p_phone: normalizePhone(phone) })) as any;
}

export async function somitiInitialized(): Promise<boolean> {
  return !!unwrap(await supabase.rpc('somiti_initialized'));
}

export async function signInWithPin(phone: string, pin: string) {
  const res = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password: pinToPassword(pin) });
  if (res.error) throw new Error(res.error.message);
  return res.data.session;
}

/** First login of a member the admin already added (PIN = initial PIN set by admin). */
export async function activateWithPin(phone: string, pin: string) {
  const res = await supabase.auth.signUp({
    email: phoneToEmail(phone),
    password: pinToPassword(pin),
    options: { data: { phone: normalizePhone(phone), pin } },
  });
  if (res.error) throw new Error(friendlyAuthError(res.error.message));
  if (!res.data.session) {
    throw new Error('Supabase-এ "Confirm email" বন্ধ করুন (Authentication → Providers → Email)।');
  }
  return res.data.session;
}

/** Very first user: creates the somiti and becomes super admin. */
export async function bootstrapSomiti(somitiName: string, adminName: string, phone: string, pin: string) {
  const res = await supabase.auth.signUp({
    email: phoneToEmail(phone),
    password: pinToPassword(pin),
    options: { data: { phone: normalizePhone(phone), pin, name: adminName, somiti_name: somitiName, bootstrap: true } },
  });
  if (res.error) throw new Error(friendlyAuthError(res.error.message));
  if (!res.data.session) {
    throw new Error('Supabase-এ "Confirm email" বন্ধ করুন (Authentication → Providers → Email)।');
  }
  return res.data.session;
}

function friendlyAuthError(msg: string) {
  // trigger errors surface as "Database error saving new user"
  if (/database error/i.test(msg)) return 'পিন ভুল অথবা নম্বরটি নিবন্ধিত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।';
  if (/already registered/i.test(msg)) return 'এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে।';
  return msg;
}

export async function fetchMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const profile = unwrap(
    await supabase.from('profiles').select('id,member_id,phone,full_name,role').eq('id', u.user.id).maybeSingle()
  ) as any;
  if (!profile) return null;
  const memberRow = profile.member_id
    ? (unwrap(await supabase.from('members').select(MEMBER_COLUMNS).eq('id', profile.member_id).maybeSingle()) as any)
    : null;
  return { profile, member: memberRow ? mapMember(memberRow) : null };
}

export async function changeOwnPin(newPin: string) {
  const res = await supabase.auth.updateUser({ password: pinToPassword(newPin) });
  if (res.error) throw new Error(res.error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// writes (all go through SECURITY DEFINER RPCs)
// ---------------------------------------------------------------------------

const rpc = async (fn: string, args: Record<string, any>) => unwrap(await supabase.rpc(fn, args));

export const addMember = (p: Record<string, any>) => rpc('add_member', { p });
export const updateMember = (id: string, p: Record<string, any>) => rpc('update_member', { p_id: id, p });
export const deleteMember = (id: string) => rpc('delete_member', { p_id: id });
export const resetMemberPin = (memberId: string, pin = '1234') =>
  rpc('admin_reset_member_pin', { p_member_id: memberId, p_new_pin: pin });

export const recordDeposit = (d: {
  id: string;
  memberId: string;
  months: string[];
  baseAmount: number;
  lateFee: number;
  totalAmount: number;
  paymentMethod: string;
  trxId?: string;
  note?: string;
}) =>
  rpc('record_deposit', {
    p_id: d.id,
    p_member_id: d.memberId,
    p_months: d.months,
    p_base_amount: d.baseAmount,
    p_late_fee: d.lateFee,
    p_total_amount: d.totalAmount,
    p_payment_method: d.paymentMethod,
    p_trx_id: d.trxId ?? null,
    p_note: d.note ?? null,
  });

export const addExpense = (d: {
  title: string;
  category: string;
  amount: number;
  paymentSource: string;
  voucherNo: string;
  note?: string;
  status?: string;
}) =>
  rpc('add_expense', {
    p_title: d.title,
    p_category: d.category,
    p_amount: d.amount,
    p_payment_source: d.paymentSource,
    p_voucher_no: d.voucherNo,
    p_note: d.note ?? null,
    p_status: d.status ?? 'approved',
  });

export const approveRequest = (id: string) => rpc('approve_request', { p_id: id });
export const rejectRequest = (id: string, reason?: string) => rpc('reject_request', { p_id: id, p_reason: reason ?? null });

export const recordProjectReturn = (d: { projectId: string; amount: number; paymentSource: string; note?: string }) =>
  rpc('record_project_return', {
    p_project_id: d.projectId,
    p_amount: d.amount,
    p_payment_source: d.paymentSource,
    p_note: d.note ?? null,
  });

export const transferCash = (from: string, to: string, amount: number, note?: string) =>
  rpc('transfer_cash', { p_from: from, p_to: to, p_amount: amount, p_note: note ?? null });

export const updateSomitiInfo = (p: Record<string, any>) => rpc('update_somiti_info', { p });

export const addNotice = (title: string, body: string) => rpc('add_notice', { p_title: title, p_body: body });
export const deleteNotice = (id: string) => rpc('delete_notice', { p_id: id });
export const setMemberRole = (memberId: string, role: string, title?: string) =>
  rpc('set_member_app_role', { p_id: memberId, p_role: role, p_title: title ?? null });
export const upsertProject = (p: Record<string, any>) => rpc('upsert_project', { p });
export const profitPreview = (year: number) => rpc('profit_preview', { p_year: year });
export const distributeProfit = (year: number, reservePct: number, managementPct: number) =>
  rpc('distribute_profit', { p_year: year, p_reserve_pct: reservePct, p_management_pct: managementPct });
