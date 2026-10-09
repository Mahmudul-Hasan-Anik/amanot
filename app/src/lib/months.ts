import { BENGALI_MONTHS_FULL } from './bengali';
import type { Member } from '../mocks/mockData';

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type MonthOption = {
  key: string;
  index: number;            // 0 = January
  bn: string;               // full Bengali name, sent to the server
  en: string;
  kind: 'due' | 'current' | 'advance';
  overdue: boolean;         // late fee applies
};

/**
 * Months a member can pay for right now: every unpaid due month,
 * the current month (if unpaid) and the next month as an advance.
 */
export function getDepositMonthOptions(member: Member | undefined, today = new Date()): MonthOption[] {
  if (!member) return [];
  if (member.paymentMonths) {
    const start = new Date(`${(member.duesStartMonth || member.joinDateISO || todayISO(today)).slice(0, 7)}-01T00:00:00`);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const opts: MonthOption[] = [];
    for (let date = start; date <= end; date = new Date(date.getFullYear(), date.getMonth() + 1, 1)) {
      const year = date.getFullYear(), month = date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2,'0')}`;
      if (member.paymentMonths[key] === 'paid') continue;
      const current = year === today.getFullYear() && month === today.getMonth();
      const advance = date > today;
      const due = member.paymentMonths[key] === 'due';
      if (!current && !advance && !due) continue;
      opts.push({ key, index: year * 12 + month, bn: `${BENGALI_MONTHS_FULL[month]} ${year}`, en: `${ENGLISH_MONTHS[month]} ${year}`, kind:current?'current':advance?'advance':'due', overdue:due && !current });
    }
    return opts;
  }
  const cur = today.getMonth();
  const status = member.monthsStatus || {};
  const joinISO: string | undefined = (member as any).joinDateISO;
  const join = joinISO ? new Date(`${joinISO}T00:00:00`) : null;
  let start = 0;
  if (join && join.getFullYear() === today.getFullYear()) start = join.getMonth();
  if (join && join.getFullYear() > today.getFullYear()) start = 12;

  const opts: MonthOption[] = [];
  for (let i = start; i <= Math.min(11, cur + 1); i++) {
    if (status[i] === 'paid') continue;
    const isDue = status[i] === 'due';
    if (i < cur && !isDue) continue; // not owed (e.g. before join)
    opts.push({
      key: `${today.getFullYear()}-${String(i+1).padStart(2,'0')}`,
      index: i,
      bn: BENGALI_MONTHS_FULL[i],
      en: ENGLISH_MONTHS[i],
      kind: i === cur ? 'current' : i > cur ? 'advance' : 'due',
      overdue: isDue && i < cur,
    });
  }
  return opts;
}

/** Default selection: all due months + current month */
export function defaultSelectedMonths(opts: MonthOption[]): number[] {
  return opts.filter((o) => o.kind !== 'advance').map((o) => o.index);
}

/** "2026-10-06" for today in local time */
export function todayISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "06/10/2026" -> "2026-10-06" (null if invalid) */
export function parseDMY(input: string): string | null {
  const m = input.replace(/[০-৯]/g, (c) => String('০১২৩৪৫৬৭৮৯'.indexOf(c))).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!m) return null;
  const [_, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (dt.getMonth() !== Number(mo) - 1) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function todayDMY(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export type MonthKey = { key: string; year: number; month: number; bn: string; en: string };

/** Last n months including the current one, newest first. key = "YYYY-MM" */
export function recentMonths(n = 6, today = new Date()): MonthKey[] {
  const out: MonthKey[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const bnYear = String(y).replace(/\d/g, (c) => '০১২৩৪৫৬৭৮৯'[Number(c)]);
    out.push({
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      year: y,
      month: m,
      bn: `${BENGALI_MONTHS_FULL[m]} ${bnYear}`,
      en: `${ENGLISH_MONTHS[m]} ${y}`,
    });
  }
  return out;
}

/** true when an ISO date ("2026-10-06") falls in month key "2026-10" */
export const inMonth = (iso: string | undefined, key: string) => !!iso && iso.slice(0, 7) === key;
