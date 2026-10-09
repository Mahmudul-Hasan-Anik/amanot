import { toEnglishDigits } from './bengali';

/** Percentages are explicit: an absent fund/share means zero, never an assumed 10%. */
export function parseProfitPercent(value: string | number): number | null {
  const text = toEnglishDigits(String(value)).trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) return null;
  const percent = Number(text);
  return percent <= 100 ? percent : null;
}

export function calculateProfitAllocation(netProfit: number, reserve: string | number, management: string | number) {
  const reservePct = parseProfitPercent(reserve);
  const managementPct = parseProfitPercent(management);
  if (reservePct === null || managementPct === null || reservePct + managementPct > 100 || !Number.isFinite(netProfit)) return null;
  const cents = Math.max(0, Math.round(netProfit * 100));
  // Match the server's combined deduction; reconcile individual deductions to cents.
  const distributedCents = Math.round(cents * (10000 - Math.round(reservePct * 100) - Math.round(managementPct * 100)) / 10000);
  const reserveCents = Math.round(cents * Math.round(reservePct * 100) / 10000);
  return { reservePct, managementPct, reserveFund: reserveCents / 100, managementFund: (cents - distributedCents - reserveCents) / 100, distributed: distributedCents / 100 };
}
