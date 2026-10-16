import { BENGALI_MONTHS_FULL } from './bengali';

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
