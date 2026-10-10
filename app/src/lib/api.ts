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
import { Platform } from 'react-native';
import { readProfilePhoto } from './profilePhoto';
import { friendlyAuthError } from './authErrors';
import { LedgerFilter, LedgerCursor, LedgerPage, LedgerSummary, emptyLedgerSummary } from './ledger';

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
  'profit_2025,estimated_profit_2026,months_status,next_followup,partial_credit,dues_start_month,profit_balance,last_profit_year,avatar_path';

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
    const key = `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`;
    const v = r.months_status?.[key] ?? r.months_status?.[String(i)];
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
    paymentMonths: r.months_status || {},
    duesStartMonth: r.dues_start_month,
    profitBalance: num(r.profit_balance),
    lastProfitYear: r.last_profit_year,
    avatarPath: r.avatar_path,
    photoUri: r.photo_uri,
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

export function mapProject(r: any): Project {
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

export function mapExpense(r: any): ExpenseItem {
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

export async function fetchTransactionPage(filter:LedgerFilter={},cursor:LedgerCursor|null=null,limit=50):Promise<LedgerPage> {
  const result=unwrap(await supabase.rpc('get_transaction_page',{
    p_limit:limit,p_before_created:cursor?.createdAt||null,p_before_id:cursor?.id||null,
    p_from:filter.from||null,p_to:filter.to||null,p_member_id:filter.memberId||null,
    p_project_id:filter.projectId||null,p_paid_month:filter.paidMonth||null,
  })) as any;
  return {rows:result.rows.map(mapTransaction),hasMore:result.hasMore,cursor:result.cursor};
}

export async function fetchLedgerSummary(from:string,to:string):Promise<LedgerSummary> {
  return unwrap(await supabase.rpc('get_ledger_summary',{p_from:from,p_to:to})) as LedgerSummary;
}

/** Export only the requested scope; retry if accounting changes during paging. */
export async function fetchTransactionHistory(filter:LedgerFilter={}):Promise<Transaction[]> {
  for(let attempt=0;attempt<2;attempt++) {
    const revision=await fetchSyncRevision();
    const rows:Transaction[]=[];let cursor:LedgerCursor|null=null;
    do {
      const page=await fetchTransactionPage(filter,cursor,200);
      rows.push(...page.rows);
      if(!page.hasMore)break;
      if(!page.cursor || page.cursor.id===cursor?.id)throw new Error('Ledger pagination did not advance');
      cursor=page.cursor;
    } while(true);
    if(revision===await fetchSyncRevision())return rows;
  }
  throw new Error('হিসাব পরিবর্তন হচ্ছে। একটু পরে আবার এক্সপোর্ট করুন।');
}

export async function fetchTransactionByReference(reference:string):Promise<Transaction|null> {
  const ref=reference.replace(/^#/,'');
  const column=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(ref)?'id':'receipt_no';
  const result=unwrap(await supabase.from('transactions').select('*').eq(column,ref).maybeSingle());
  return result ? mapTransaction(result) : null;
}

const allRows = async (table:string, columns='*', order='created_at', since?:string, statuses?:string[]) => {
    const rows:any[]=[];
    for(let offset=0;;offset+=1000) {
      let query = supabase.from(table).select(columns).order(order,{ascending:false}).order('id').range(offset,offset+999);
      if (table === 'members') query = query.is('deleted_at', null);
      if (statuses) query = query.in('status',statuses);
      if (since) query = query.gte('created_at',since);
      const page:any[] = unwrap(await query);
      rows.push(...page); if(page.length<1000) return rows;
    }
  };

const photoUrls = new Map<string, { url: string; expires: number }>();
let photoOwner = '';
let photoGeneration = 0;
export function clearPhotoCache() { photoUrls.clear(); photoOwner = ''; photoGeneration++; }
export async function signedPhotoUrls(paths: string[], owner: string) {
  if (owner !== photoOwner) { clearPhotoCache(); photoOwner = owner; }
  const generation = photoGeneration;
  const now = Date.now();
  const result = new Map<string,string>();
  const missing = [...new Set(paths)].filter(path => {
    const cached = photoUrls.get(path);
    if (cached && cached.expires > now) { result.set(path,cached.url); return false; }
    photoUrls.delete(path); return true;
  });
  if (missing.length) {
    const {data} = await supabase.storage.from('member-documents').createSignedUrls(missing,3600);
    // Ignore responses from an account that was locked/logged out meanwhile.
    if (owner !== photoOwner || generation !== photoGeneration) return new Map<string,string>();
    for (const item of data || []) if (item.path && item.signedUrl && !item.error) {
      photoUrls.set(item.path,{url:item.signedUrl,expires:now+55*60*1000});
      result.set(item.path,item.signedUrl);
    }
  }
  return result;
}
export async function fetchAuditLogs() {
  const rows = unwrap(await supabase.from('audit_logs').select('*').order('id',{ascending:false}).limit(300)) as any[];
  return (rows || []).map(a=>({id:String(a.id),action:a.action as string,actor:a.actor_name || '',details:a.details || {},createdAt:a.created_at as string}));
}
export async function fetchApprovalHistory() {
  const rows = await allRows('approvals','*','created_at',undefined,['approved','rejected']);
  return {approved:rows.filter(a=>a.status==='approved').map(mapApproval),rejected:rows.filter(a=>a.status==='rejected').map(mapApproval)};
}
export async function fetchMembersAndSummary(photoScope: string) {
  const [rows, summary] = await Promise.all([allRows('members',MEMBER_COLUMNS,'code'),supabase.rpc('get_somiti_summary').then(unwrap)]);
  const signed = await signedPhotoUrls(rows.map(m=>m.avatar_path).filter(Boolean),photoScope);
  return {members:rows.map(m=>mapMember({...m,photo_uri:signed.get(m.avatar_path)})),summary:summary as Record<string,any>};
}
export async function fetchAll(isStaff: boolean, photoScope = '') {
  const q = <T,>(p: PromiseLike<{ data: T | null; error: any }>) => p.then(unwrap);
  const empty = Promise.resolve([] as any[]);

  // bring every member's due status up to today before reading (cheap, server-side)
  if (isStaff) {
    await supabase.rpc('refresh_dues').then(() => {}, () => {});
  }

  const [settings, summary, members, projects, cash, ledgerPage, expenses, approvals, notices] = await Promise.all([
    q(supabase.from('somiti_settings').select('info').eq('id', 1).maybeSingle()),
    q(supabase.rpc('get_somiti_summary')),
    allRows('members',MEMBER_COLUMNS,'code'),
    allRows('projects'),
    isStaff ? q(supabase.from('cash_accounts').select('*').order('sort')) : empty,
    fetchTransactionPage(),
    isStaff ? q(supabase.from('expenses').select('*').order('created_at',{ascending:false}).limit(50)) : empty,
    isStaff ? allRows('approvals','*','created_at',undefined,['pending']) : empty,
    Promise.resolve(q(supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(50))).catch(() => []),
  ]);

  const ledger = ledgerPage.rows;
  const txRows = ledger.map(t=>({member_id:t.memberId,date:t.dateISO,receipt_no:t.receiptNo,note:t.note,months:t.months,amount:t.amount,payment_method:t.paymentMethod}));
  const recentByMember=new Map<string,typeof txRows>();
  for(const transaction of txRows){
    const recent=recentByMember.get(transaction.member_id)||[];
    if(recent.length<10)recent.push(transaction);
    recentByMember.set(transaction.member_id,recent);
  }
  const memberRows = (members as any[]) || [];
  const paths = memberRows.map(m=>m.avatar_path).filter(Boolean);
  if (paths.length) {
    const signed = await signedPhotoUrls(paths, photoScope);
    memberRows.forEach(m=>{m.photo_uri=signed.get(m.avatar_path);});
  }
  const apRows = (approvals as any[]) || [];
  return {
    somitiInfo: { ...((settings as any)?.info || {}), ...((summary as any) || {}) },
    members: memberRows.map((m) => mapMember(m, recentByMember.get(m.id)||[])),
    projects: ((projects as any[]) || []).map(mapProject),
    cashAccounts: ((cash as any[]) || []).map(mapCash),
    transactions: ledger,
    ledgerSummary: emptyLedgerSummary,
    expenses: ((expenses as any[]) || []).filter((e) => e.status !== 'rejected').map(mapExpense),
    approvals: apRows.filter((a) => a.status === 'pending').map(mapApproval),
    approvedApprovals: [],
    rejectedApprovals: [],
    notices: ((notices as any[]) || []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdBy: n.created_by_name || '',
      createdAt: n.created_at,
    })),
    auditLogs: [],
  };
}

export async function fetchSyncRevision(): Promise<string> {
  return unwrap(await supabase.rpc('get_sync_revision')) as string;
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
  const email=phoneToEmail(phone),password=pinToPassword(pin);
  await verifyLoginPin(phone,pin);
  const res = await supabase.auth.signInWithPassword({ email, password });
  if (res.error) throw new Error(friendlyAuthError(res.error.message));
  await confirmPinSession(pin);
  return res.data.session;
}

/** First login of a member the admin already added (PIN = initial PIN set by admin). */
export async function activateWithPin(phone: string, pin: string) {
  const email=phoneToEmail(phone),password=pinToPassword(pin);
  await verifyLoginPin(phone,pin);
  const res = await supabase.auth.signUp({
    email,
    password,
    options: { data: { phone: normalizePhone(phone), pin } },
  });
  if (res.error) throw new Error(friendlyAuthError(res.error.message));
  if (!res.data.session) {
    throw new Error('অ্যাকাউন্ট চালু করা যায়নি। সমিতির অ্যাডমিনের সাথে যোগাযোগ করুন।');
  }
  await confirmPinSession(pin);
  return res.data.session;
}

/** Creates a separate society; its registering owner becomes that society's super admin. */
export async function bootstrapSomiti(somitiName: string, adminName: string, phone: string, pin: string) {
  const res = await supabase.auth.signUp({
    email: phoneToEmail(phone),
    password: pinToPassword(pin),
    options: { data: { phone: normalizePhone(phone), pin, name: adminName, somiti_name: somitiName, bootstrap: true } },
  });
  if (res.error) throw new Error(friendlyAuthError(res.error.message));
  if (!res.data.session) {
    throw new Error('অ্যাকাউন্ট চালু করা যায়নি। সমিতির অ্যাডমিনের সাথে যোগাযোগ করুন।');
  }
  await confirmPinSession(pin);
  return res.data.session;
}

async function verifyLoginPin(phone:string,pin:string) {
  const result=unwrap(await supabase.rpc('verify_login_pin',{p_phone:normalizePhone(phone),p_pin:pin})) as {ok:boolean;error?:string};
  if (!result.ok) throw new Error(result.error || 'পিন যাচাই ব্যর্থ।');
}

async function confirmPinSession(pin:string) {
  try {
    const result=unwrap(await supabase.rpc('confirm_pin_session',{p_pin:pin})) as {ok:boolean;error?:string};
    if (!result.ok) throw new Error(result.error || 'পিন যাচাই ব্যর্থ।');
  } catch(error) {
    await supabase.auth.signOut({scope:'local'});
    throw error;
  }
}

export async function deleteMyAccount(pin:string,closeSociety:boolean,confirmation:string) {
  const {data,error}=await supabase.functions.invoke('delete-account',{body:{pin,closeSociety,confirmation}});
  if (error) {
    const response=error.context;
    const details=response && typeof response.json==='function' ? await response.json().catch(()=>null) : null;
    throw new Error(details?.error || 'অনুরোধ সম্পন্ন হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।');
  }
  if (!data?.ok) throw new Error(data?.error || 'Account deletion failed');
  await supabase.auth.signOut({scope:'local'});
  return data as {ok:true;cleanupPending:boolean};
}

export async function fetchMyProfile(freshSignInUserId?: string) {
  // The optional ID comes only from the just-completed Auth sign-in response.
  // Ordinary refreshes continue to validate the user with the Auth server.
  const userId = freshSignInUserId || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return null;
  // A many-to-one FK join returns this account's member with its profile in one request.
  // Readiness runs concurrently; neither active-account nor PIN-session checks are skipped.
  const [row, ready] = await Promise.all([
    supabase.from('profiles').select('id,member_id,phone,full_name,role,is_active,must_change_pin,member:members!member_id('+MEMBER_COLUMNS+')').eq('id',userId).maybeSingle().then(unwrap),
    supabase.rpc('session_ready').then(unwrap),
  ]);
  const profile = row as any;
  if (!profile || !profile.is_active || (!profile.must_change_pin && ready !== true)) return null;
  const memberRow = profile.member;
  if (memberRow && memberRow.id !== profile.member_id) return null;
  if (profile.member_id && !profile.must_change_pin && !memberRow) return null;
  const {member: joinedMember, ...accountProfile} = profile;
  return {profile:accountProfile,member:memberRow ? mapMember(memberRow) : null};
}

export async function changeOwnPin(newPin: string, currentPin: string) {
  const result = unwrap(await supabase.rpc('change_own_pin', { p_current_pin:currentPin, p_new_pin:newPin })) as { ok:boolean; error?:string };
  if (!result.ok) throw new Error(result.error || 'PIN change failed');
  await supabase.auth.signOut({ scope:'local' });
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// writes (all go through SECURITY DEFINER RPCs)
// ---------------------------------------------------------------------------

const rpc = async (fn: string, args: Record<string, any> = {}) => unwrap(await supabase.rpc(fn, args));

export const addMember = (p: Record<string, any>) => rpc('add_member', { p });
export const updateMember = (id: string, p: Record<string, any>) => rpc('update_member', { p_id: id, p });
export const deleteMember = (id: string) => rpc('delete_member', { p_id: id });
export const resetMemberPin = (memberId: string, pin: string) =>
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

export const autoApproveEligible = () => rpc('auto_approve_eligible');

export async function uploadMemberProfilePhoto(memberId: string, photoUri: string) {
  const { bytes, extension, contentType } = await readProfilePhoto(photoUri);
  const path = `${memberId}/avatar-${uuid()}.${extension}`;
  unwrap(await supabase.storage.from('member-documents').upload(path, bytes, { contentType }));
  await rpc('set_member_documents', { p_member_id: memberId, p_avatar_path: path, p_nid_path: null });
}

export const logSms = (d: {
  phone: string;
  message: string;
  template?: string;
  recipientName?: string;
  memberId?: string;
  provider?: string;
  status?: string;
  response?: any;
}) =>
  rpc('log_sms', {
    p_phone: d.phone,
    p_message: d.message,
    p_template: d.template ?? 'custom',
    p_recipient_name: d.recipientName ?? null,
    p_member_id: d.memberId ?? null,
    p_provider: d.provider ?? 'mock',
    p_status: d.status ?? 'sent',
    p_response: d.response ?? {},
  });
