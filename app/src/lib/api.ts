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

type PerformanceStage = 'pin-precheck' | 'password-signin' | 'pin-session' | 'profile' | 'account-snapshot';
const performanceSamples: { stage: PerformanceStage; durationMs: number; ok: boolean }[] = [];
// Bounded, memory-only diagnostics: never record identities, PINs, tokens or errors.
export function getPerformanceSamples() { return performanceSamples.map(sample => ({ ...sample })); }
export function clearPerformanceSamples() { performanceSamples.length = 0; }
async function measureStage<T>(stage: PerformanceStage, task: () => PromiseLike<T>): Promise<T> {
  const started = Date.now();
  let ok = false;
  try { const value = await task(); ok = true; return value; }
  finally {
    const sample = { stage, durationMs: Math.max(0, Date.now() - started), ok };
    performanceSamples.push(sample);
    if (performanceSamples.length > 40) performanceSamples.shift();
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.debug('[amanot:performance]', sample);
  }
}

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
  if (res.error) throw Object.assign(new Error(res.error.message || 'সার্ভার ত্রুটি'),{code:res.error.code});
  return res.data as T;
}

// ---------------------------------------------------------------------------
// mappers
// ---------------------------------------------------------------------------

const MEMBER_COLUMNS =
  'id,user_id,code,member_category,member_number,name,name_en,father_name,mother_name,phone,whatsapp,nid,address,nominee_name,nominee_name_en,nominee_relation,' +
  'nominee_phone,join_date,monthly_amount,total_deposit,due_amount,due_months,status,role_title,app_role,' +
  'profit_2025,estimated_profit_2026,months_status,next_followup,partial_credit,dues_start_month,profit_balance,last_profit_year,avatar_path,total_withdrawn';

const LEGACY_MEMBER_COLUMNS=MEMBER_COLUMNS.replace('member_category,member_number,','');
let identitySchemaSupported:boolean|null=null;
let parentSchemaSupported=true;
function missingIdentityColumns(error:any){return error?.code==='42703' && /member_category|member_number/.test(error.message || '')}
async function memberRead<T>(load:(columns:string)=>PromiseLike<{data:T|null;error:any}>):Promise<T>{
  const read=async(columns:string)=>{
    let result=await load(parentSchemaSupported?columns:columns.replace('father_name,mother_name,',''));
    if(result.error?.code==='42703' && /father_name|mother_name/.test(result.error.message || '')){
      parentSchemaSupported=false;result=await load(columns.replace('father_name,mother_name,',''));
    }
    return result;
  };
  let result=await read(identitySchemaSupported===false?LEGACY_MEMBER_COLUMNS:MEMBER_COLUMNS);
  if(missingIdentityColumns(result.error)){identitySchemaSupported=false;result=await read(LEGACY_MEMBER_COLUMNS)}
  else if(!result.error && identitySchemaSupported!==false)identitySchemaSupported=true;
  return unwrap(result);
}

export function mapTransaction(r: any): Transaction {
  return {
    projectId: r.project_id || undefined,
    principalPart: r.principal_part == null ? undefined : num(r.principal_part),
    profitPart: r.profit_part == null ? undefined : num(r.profit_part),
    investmentReversal: r.investment_reversal || false,
    investmentDisbursement: r.type==='transfer' && !!r.project_id && r.party_code==='INV',
    investmentPaymentReversed: r.investment_payment_reversed || false,
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
    memberCategory: r.member_category || undefined,
    memberNumber: r.member_number || undefined,
    name: r.name,
    fatherName: r.father_name || '',
    motherName: r.mother_name || '',
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
    totalWithdrawn: num(r.total_withdrawn),
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
    contract: r.contract ? mapInvestmentContract(r.contract) : undefined,
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
export async function fetchMemberStatementSnapshot(memberId:string){
 const revision=await fetchSyncRevision();
 const [row,transactions]=await Promise.all([
  memberRead(columns=>supabase.from('members').select(columns).eq('id',memberId).maybeSingle()),
  fetchTransactionHistory({memberId}),
 ]);
 if(!row)throw new Error('সদস্য পাওয়া যায়নি / Member unavailable');
 if(revision!==await fetchSyncRevision())throw new Error('হিসাব পরিবর্তন হয়েছে। আবার চেষ্টা করুন। / Account changed; please retry.');
 return {member:mapMember(row),transactions};
}
export async function fetchMemberBalancesSnapshot(){
 const revision=await fetchSyncRevision();
 const rows=await allRows('members',MEMBER_COLUMNS,'code');
 if(revision!==await fetchSyncRevision())throw new Error('হিসাব পরিবর্তন হয়েছে। আবার চেষ্টা করুন। / Account changed; please retry.');
 return rows.map(m=>mapMember(m));
}

const allRows = async (table:string, columns='*', order='created_at', since?:string, statuses?:string[]) => {
    const rows:any[]=[];
    for(let offset=0;;offset+=1000) {
      const read=(selected:string)=>{
        let query=supabase.from(table).select(selected).order(order,{ascending:false}).order('id').range(offset,offset+999);
        if(table==='members')query=query.is('deleted_at',null);
        if(statuses)query=query.in('status',statuses);
        if(since)query=query.gte('created_at',since);
        return query;
      };
      const page:any[]=table==='members'?await memberRead(read):unwrap(await read(columns));
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
export async function fetchWithdrawals(): Promise<import('./withdrawal').Withdrawal[]> {
  return (await allRows('withdrawal_requests','*','created_at')).map(r=>({...r,amount:num(r.amount)})) as import('./withdrawal').Withdrawal[];
}
export async function submitWithdrawal(p:{id:string;memberId:string;amount:number;method:string;reason:string}) {
  return unwrap(await supabase.rpc('submit_withdrawal',{p}));
}
export async function decideWithdrawal(id:string,action:'approve'|'reject'|'cancel',note:string) {
  return unwrap(await supabase.rpc('decide_withdrawal',{p_id:id,p_action:action,p_note:note}));
}
export async function payWithdrawal(id:string,method:string,date:string,reference:string,note:string) {
  return unwrap(await supabase.rpc('pay_withdrawal',{p_id:id,p_method:method,p_date:date,p_reference:reference,p_note:note}));
}
export async function reverseWithdrawal(id:string,reversalId:string,date:string,reason:string) {
  return unwrap(await supabase.rpc('reverse_withdrawal',{p_id:id,p_reversal_id:reversalId,p_date:date,p_reason:reason}));
}
export async function fetchAll(isStaff: boolean, photoScope = '', deferPhotos = false) {
  return measureStage('account-snapshot', () => fetchSnapshot(isStaff, photoScope, deferPhotos));
}
async function fetchSnapshot(isStaff: boolean, photoScope: string, deferPhotos: boolean) {
  const q = <T,>(p: PromiseLike<{ data: T | null; error: any }>) => p.then(unwrap);
  const empty = Promise.resolve([] as any[]);

  const [settings, summary, members, projects, cash, ledgerPage, expenses, approvals, notices, contracts, proposals, withdrawals] = await Promise.all([
    q(supabase.from('somiti_settings').select('info').eq('id', 1).maybeSingle()),
    q(supabase.rpc('get_somiti_summary')),
    allRows('members',MEMBER_COLUMNS,'code'),
    allRows('projects'),
    isStaff ? q(supabase.from('cash_accounts').select('*').order('sort')) : empty,
    fetchTransactionPage(),
    isStaff ? q(supabase.from('expenses').select('*').order('created_at',{ascending:false}).limit(50)) : empty,
    isStaff ? allRows('approvals','*','created_at',undefined,['pending']) : empty,
    Promise.resolve(q(supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(50))).catch(() => []),
    isStaff ? fetchInvestmentContracts() : empty,
    isStaff ? fetchInvestmentProposals() : empty,
    fetchWithdrawals(),
  ]);

  if(Number((summary as any)?.backendVersion||0)<23)throw new Error('Backend update required. / সার্ভারের নতুন update প্রয়োজন।');
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
  if (paths.length && !deferPhotos) {
    const signed = await signedPhotoUrls(paths, photoScope);
    memberRows.forEach(m=>{m.photo_uri=signed.get(m.avatar_path);});
  }
  const apRows = (approvals as any[]) || [];
  return {
    somitiInfo: { ...((settings as any)?.info || {}), ...((summary as any) || {}) },
    members: memberRows.map((m) => mapMember(m, recentByMember.get(m.id)||[])),
    projects: ((projects as any[]) || []).map(p => mapProject({...p,contract:contracts.find((c:any)=>c.id===p.id)})),
    investmentProposals: proposals,
    withdrawalRequests: withdrawals,
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
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  // A local session is only a candidate. The server still validates the active
  // account, session revocation, credentials timestamp, PIN and attempt limits.
  if (!error && session?.user.email === email && (session.expires_at || 0) > Date.now()/1000 + 30) {
    const result = await measureStage('pin-session', async () => {
      const response = await supabase.rpc('confirm_pin_session', { p_pin: pin });
      if (response.error?.code === 'PGRST301' || response.error?.code === 'PGRST303') return null;
      const confirmation = unwrap(response) as { ok: boolean; error?: string };
      if (confirmation.ok) return true;
      if (confirmation.error === 'আবার লগইন করুন।') return null;
      // Wrong PIN/lockout/network failure must never fall through to a second attempt.
      throw new Error(confirmation.error || 'পিন যাচাই ব্যর্থ।');
    });
    if (result) return session;
    await supabase.auth.signOut({ scope: 'local' });
  }
  await measureStage('pin-precheck', () => verifyLoginPin(phone,pin));
  const res = await measureStage('password-signin', async () => {
    const response = await supabase.auth.signInWithPassword({ email, password });
    if (response.error) throw new Error(friendlyAuthError(response.error.message));
    return response;
  });
  await measureStage('pin-session', () => confirmPinSession(pin));
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
export async function bootstrapSomiti(somitiName: string, adminName: string, phone: string, pin: string, memberCategory?:string, memberNumber?:string) {
  const res = await supabase.auth.signUp({
    email: phoneToEmail(phone),
    password: pinToPassword(pin),
    options: { data: { phone: normalizePhone(phone), pin, name: adminName, somiti_name: somitiName, bootstrap: true, member_category:memberCategory, member_number:memberNumber } },
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
  return measureStage('profile', () => fetchVerifiedProfile(freshSignInUserId));
}
async function fetchVerifiedProfile(freshSignInUserId?: string) {
  // The optional ID comes from Auth sign-in or a server-confirmed PIN session.
  // Ordinary refreshes continue to validate the user with the Auth server.
  const userId = freshSignInUserId || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return null;
  // A many-to-one FK join returns this account's member with its profile in one request.
  // Readiness runs concurrently; neither active-account nor PIN-session checks are skipped.
  const [row, ready] = await Promise.all([
    memberRead(columns=>supabase.from('profiles').select('id,member_id,phone,full_name,role,is_active,must_change_pin,member:members!member_id('+columns+')').eq('id',userId).maybeSingle()),
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

let memberDetailsWriteReady=false;
let voluntarySchemaReady=false;
async function requireVoluntarySchema(){
  if(voluntarySchemaReady)return;
  const result=await supabase.from('somiti_settings').select('info').eq('id',1).maybeSingle();
  if(result.error || result.data?.info?.depositMode!=='voluntary')throw new Error('নতুন জমার নিয়ম এখনো চালু হয়নি। / The updated deposit rules are not available yet.');
  voluntarySchemaReady=true;
}
async function requireMemberDetailsSchema(){
  if(memberDetailsWriteReady)return;
  const result=await supabase.from('members').select('father_name,mother_name').limit(0);
  if(result.error)throw new Error('সদস্যের নতুন তথ্য সংরক্ষণের backend update এখনো চালু হয়নি। / Apply the member details migration before saving parent names.');
  memberDetailsWriteReady=true;
  parentSchemaSupported=true;
}

export const addMember = async(p: Record<string, any>) => {
  await requireVoluntarySchema();
  if(identitySchemaSupported!==true){
    const probe=await supabase.from('members').select('member_category,member_number').limit(0);
    if(probe.error)throw new Error('সদস্য ID-এর backend migration এখনো প্রয়োগ হয়নি। / Apply the member identity migration before adding members.');
    identitySchemaSupported=true;
  }
  if('fatherName' in p || 'motherName' in p)await requireMemberDetailsSchema();
  const result=await supabase.rpc('add_member',{p:{...p,monthlyAmount:0}});
  if(result.error?.code==='23505' && /members_number_identity_uq/.test(result.error.message))throw new Error('এই সদস্য নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে। / Member number is already in use.');
  return unwrap(result);
};
export const updateMember = async(id: string, p: Record<string, any>) => {
  if('fatherName' in p || 'motherName' in p)await requireMemberDetailsSchema();
  return rpc('update_member', { p_id: id, p });
};
export const deleteMember = (id: string) => rpc('delete_member', { p_id: id });
export const resetMemberPin = (memberId: string, pin: string) =>
  rpc('admin_reset_member_pin', { p_member_id: memberId, p_new_pin: pin });

export const recordDeposit = async(d: {
  id: string;
  memberId: string;
  months: string[];
  baseAmount: number;
  lateFee: number;
  totalAmount: number;
  paymentMethod: string;
  trxId?: string;
  note?: string;
  date?: string;
}) => {
  await requireVoluntarySchema();
  if(d.lateFee!==0 || d.baseAmount!==d.totalAmount)throw new Error('বিলম্ব ফি বন্ধ রয়েছে। / Late fees are disabled.');
  const payload: any = {
    p_id: d.id,
    p_member_id: d.memberId,
    p_months: [],
    p_base_amount: d.baseAmount,
    p_late_fee: d.lateFee,
    p_total_amount: d.totalAmount,
    p_payment_method: d.paymentMethod,
    p_trx_id: d.trxId ?? null,
    p_note: d.note ?? null,
  };
  if (d.date) {
    payload.p_date = d.date;
  }
  let res = await supabase.rpc('record_deposit', payload);
  if (res.error && d.date && (res.error.code === '42883' || /p_date|does not exist|function/i.test(res.error.message || ''))) {
    delete payload.p_date;
    if (d.date) {
      payload.p_note = payload.p_note ? `[তারিখ: ${d.date}] ${payload.p_note}` : `[তারিখ: ${d.date}] জমা`;
    }
    res = await supabase.rpc('record_deposit', payload);
  }
  return unwrap(res);
};

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
export function mapInvestmentContract(r:any): import('./investment').InvestmentContract {
  return {id:r.id,memberId:r.member_id||undefined,number:r.contract_no,recipientName:r.recipient_name,
    phone:r.phone,whatsapp:r.whatsapp||'',address:r.address||'',nid:r.nid||'',fatherName:r.father_name||'',motherName:r.mother_name||'',
    contacts:r.emergency_contacts||[],principal:num(r.principal),profitPct:num(r.profit_pct),profitAmount:num(r.profit_amount),
    termMonths:r.term_months,disbursedDate:r.disbursed_date,firstDueDate:r.first_due_date,purpose:r.purpose||''};
}
async function fetchInvestmentContracts():Promise<any[]> {
  try { return await allRows('investment_contracts','id,member_id,contract_no,recipient_name,phone,whatsapp,address,nid,father_name,mother_name,emergency_contacts,principal,profit_pct,profit_amount,term_months,disbursed_date,first_due_date,purpose'); }
  catch(e:any) {
    // Read-only compatibility until the additive contract migration is deployed.
    if(e.code==='42P01'||e.code==='PGRST205'||/Could not find the table.*investment_contracts/.test(e.message||''))return [];
    throw e;
  }
}
export const createInvestment = (p:import('./investment').NewInvestment) => rpc('submit_investment_proposal',{p});
export const collectInvestment = async(p:import('./investment').InvestmentPayment):Promise<Transaction> =>
  mapTransaction(await rpc('collect_investment_payment',{p}));
export const reverseInvestment = (id:string,paymentId:string,reason:string) => rpc('reverse_investment_payment',{p_id:id,p_payment_id:paymentId,p_reason:reason});
export const recordInvestmentReminder = (id:string,investmentId:string) => rpc('record_investment_reminder',{p_id:id,p_investment_id:investmentId});
export const recordInvestmentExpense = (p:{id:string;projectId:string;amount:number;paymentMethod:string;note:string}) => rpc('record_investment_expense',{p});
export const fetchLastInvestmentReminder = async(investmentId:string):Promise<{created_at:string}|null> =>
  unwrap(await supabase.from('investment_reminder_attempts').select('created_at').eq('investment_id',investmentId).order('created_at',{ascending:false}).limit(1).maybeSingle());
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

export async function fetchInvestmentProposals():Promise<import('./investment').InvestmentProposal[]> {
 return await allRows('investment_proposals','id,status,payload,created_at,approved_at,disbursed_at,decision_note');
}
export const decideInvestmentProposal=(id:string,approve:boolean,note:string)=>rpc('decide_investment_proposal',{p_id:id,p_approve:approve,p_note:note});
export const disburseInvestmentProposal=(id:string,date:string,firstDue:string,method:string)=>rpc('disburse_investment_proposal',{p_id:id,p_date:date,p_first_due:firstDue,p_method:method});

export const withdrawInvestmentProposal=(id:string,note:string)=>rpc('withdraw_investment_proposal',{p_id:id,p_note:note});
export const mapLegacyMemberIdentity=(id:string,category:string,number:string)=>rpc('map_legacy_member_identity',{p_id:id,p_category:category,p_number:number});
export const fetchCapabilities=()=>rpc('app_capabilities');
export async function fetchDistributionShares(year:number){return unwrap(await supabase.from('profit_shares').select('member_id,year,base_deposit,share').eq('year',year));}
