import type { CashAccount } from '../mocks/mockData';
import { BENGALI_MONTHS_FULL, BENGALI_MONTHS_SHORT } from './bengali';
import { toBengaliDigits, toEnglishDigits } from './money';
import { financeLabel } from '../i18n/financeLabels';

/**
 * Display helpers for values that the server or the store keeps in Bengali
 * (dates, account names, role titles, receipt numbers). They make sure the
 * English screen does not show Bengali digits or words that came from data.
 */

const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EN_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Digits in the reader's language; everything else unchanged. */
export const localDigits = (value: string | number | null | undefined, bengali: boolean) =>
  value == null ? '' : bengali ? toBengaliDigits(String(value)) : toEnglishDigits(String(value));

function isoParts(value: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "৮ নভেম্বর ২০২৬" / "৮ নভেম্বর" → [day, monthIndex, year?] */
function bengaliParts(value: string): [number, number, number | undefined] | null {
  const m = /^\s*(\d{1,2})\s+(\S+)(?:\s+(\d{4}))?\s*$/.exec(toEnglishDigits(value));
  if (!m) return null;
  let month = BENGALI_MONTHS_FULL.indexOf(m[2]);
  if (month < 0) month = BENGALI_MONTHS_SHORT.indexOf(m[2]);
  if (month < 0) month = EN_MONTHS.indexOf(m[2]);
  if (month < 0) month = EN_MONTHS_SHORT.indexOf(m[2]);
  return month < 0 ? null : [Number(m[1]), month, m[3] ? Number(m[3]) : undefined];
}

/**
 * A date for display. Prefer the ISO value when there is one; otherwise the
 * stored text (often a Bengali date such as "৮ নভেম্বর ২০২৬") is converted.
 */
export function displayDate(value: string | null | undefined, bengali: boolean, iso?: string | null, opts: { year?: boolean; short?: boolean } = {}) {
  const withYear = opts.year !== false;
  const fmt = (d: number, mi: number, y?: number) => {
    const month = bengali ? BENGALI_MONTHS_FULL[mi] : (opts.short ? EN_MONTHS_SHORT : EN_MONTHS)[mi];
    const text = `${d} ${month}${withYear && y ? ` ${y}` : ''}`;
    return bengali ? toBengaliDigits(text) : text;
  };
  const fromIso = (v?: string | null) => { const p = v ? isoParts(v) : null; return p ? fmt(p[2], p[1] - 1, p[0]) : null; };
  const a = fromIso(iso) || fromIso(value || '');
  if (a) return a;
  const b = value ? bengaliParts(value) : null;
  if (b) return fmt(b[0], b[1], b[2]);
  return localDigits(value || '', bengali);
}

/** "Today 10:20" / "Yesterday" / "8 Nov" from a timestamp. */
export function displayRelative(timestamp: string | null | undefined, bengali: boolean) {
  const dt = timestamp ? new Date(timestamp) : null;
  if (!dt || Number.isNaN(dt.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  if (dt.getTime() >= startToday) return bengali ? `আজ ${toBengaliDigits(time)}` : `Today ${time}`;
  if (dt.getTime() >= startToday - 86400000) return bengali ? 'গতকাল' : 'Yesterday';
  const d = dt.getDate(), mi = dt.getMonth();
  return bengali ? `${toBengaliDigits(d)} ${BENGALI_MONTHS_FULL[mi]}` : `${d} ${EN_MONTHS_SHORT[mi]}`;
}

const ACCOUNT: Record<string, [string, string]> = {
  bank: ['Bank account', 'ব্যাংক হিসাব'],
  cashier: ['Cash in hand (cashier)', 'কোষাধ্যক্ষের হাতে'],
  field: ['Cash with field worker', 'মাঠকর্মীর হাতে'],
  bkash: ['bKash', 'বিকাশ'],
  nagad: ['Nagad mobile account', 'নগদ মোবাইল হিসাব'],
};

/**
 * Account name for display. A default account keeps its translated type name;
 * an account the society renamed keeps its own name in both languages.
 */
export function accountLabel(account: Pick<CashAccount, 'name' | 'type'> | undefined | null, bengali: boolean) {
  if (!account) return '';
  const known = ACCOUNT[account.type || ''];
  const defaults = Object.values(ACCOUNT).flat();
  if (known && (!account.name || defaults.includes(account.name))) return bengali ? known[1] : known[0];
  return bengali ? account.name : financeLabel(account.name, false);
}

const ROLES: Record<string, string> = {
  'সভাপতি': 'President', 'সহ-সভাপতি': 'Vice President', 'সহ সভাপতি': 'Vice President',
  'সাধারণ সম্পাদক': 'General Secretary', 'সম্পাদক': 'Secretary', 'যুগ্ম সম্পাদক': 'Joint Secretary',
  'কোষাধ্যক্ষ': 'Treasurer', 'ক্যাশিয়ার': 'Cashier', 'সাধারণ সদস্য': 'General member', 'সদস্য': 'Member',
  'সুপার অ্যাডমিন': 'Super admin', 'অ্যাডমিন': 'Admin', 'মাঠকর্মী': 'Field worker', 'পরিচালক': 'Director',
  'শেয়ার হোল্ডার': 'Shareholder', 'উপদেষ্টা': 'Adviser',
};

/** Committee / role title such as "সভাপতি · সুপার অ্যাডমিন" in the reader's language. */
export function roleTitle(title: string | null | undefined, bengali: boolean) {
  if (!title || bengali) return title || '';
  return title.split(/\s*·\s*/).map(part => ROLES[part.trim()] || part).join(' · ');
}
