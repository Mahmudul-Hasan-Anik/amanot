import { Linking, Share } from 'react-native';
import { normalizeContactPhone } from '../lib/investment';

/** Short receipt text people can read on WhatsApp (Bengali, khata style). */
export function receiptText(p: { society: string; title: string; name: string; code?: string; amount: number; date: string; receiptNo?: string; method?: string; balance?: number; extra?: string }, money: (n: number) => string) {
  return [
    `${p.society}`,
    `${p.title}`,
    `${p.name}${p.code ? ` (${p.code})` : ''}`,
    `টাকা: ${money(p.amount)}`,
    `তারিখ: ${p.date}`,
    p.method ? `মাধ্যম: ${p.method}` : '',
    p.receiptNo ? `রসিদ: ${p.receiptNo}` : '',
    p.balance !== undefined ? `এখন সঞ্চয়: ${money(p.balance)}` : '',
    p.extra || '',
    'ধন্যবাদ।',
  ].filter(Boolean).join('\n');
}

export interface PassbookReportParams {
  society: string;
  name: string;
  code?: string;
  phone?: string;
  currentSavings: number;
  totalDeposit?: number;
  totalWithdrawn?: number;
  profitBalance?: number;
  lines: Array<{
    date: string;
    what?: string;
    inAmt: number;
    outAmt: number;
    balance: number;
  }>;
  isBengali?: boolean;
}

/** Full passbook report text that can be sent on WhatsApp with one click. */
export function passbookReportText(p: PassbookReportParams, money: (n: number) => string): string {
  const bn = p.isBengali !== false;
  const l = (en: string, b: string) => (bn ? b : en);

  const header = [
    `*${p.society}*`,
    `*${l('Member Statement (Passbook)', 'সদস্য হিসাব বিবরণী (পাসবই)')}*`,
    '--------------------------------',
    `*${l('Member', 'সদস্য')}:* ${p.name}${p.code ? ` (${p.code})` : ''}`,
    p.phone ? `*${l('Mobile', 'মোবাইল')}:* ${p.phone}` : '',
    '--------------------------------',
  ].filter(Boolean);

  const totalIn = p.totalDeposit !== undefined
    ? p.totalDeposit
    : p.lines.reduce((s, r) => s + (r.inAmt || 0), 0);
  const totalOut = p.totalWithdrawn !== undefined
    ? p.totalWithdrawn
    : p.lines.reduce((s, r) => s + (r.outAmt || 0), 0);

  const summary = [
    `*${l('Account Summary', 'হিসাব সারাংশ')}:*`,
    `• ${l('Total Deposit', 'মোট জমা')}: ${money(totalIn)}`,
    `• ${l('Total Withdrawn', 'মোট উত্তোলন')}: ${money(totalOut)}`,
    `• ${l('Current Savings', 'বর্তমান সঞ্চয়')}: ${money(p.currentSavings)}`,
    p.profitBalance && p.profitBalance > 0
      ? `• ${l('Allocated Profit', 'বণ্টিত মুনাফা')}: ${money(p.profitBalance)}`
      : '',
    '--------------------------------',
  ].filter(Boolean);

  const txLines: string[] = [];
  if (p.lines.length > 0) {
    txLines.push(`*${l('Transaction Breakdown', 'লেনদেন বিবরণী')}:*`);
    const displayLines = p.lines.length > 25 ? p.lines.slice(-25) : p.lines;
    if (p.lines.length > 25) {
      txLines.push(l(
        `[Showing last 25 of ${p.lines.length} transactions]`,
        `[সর্বশেষ ২৫টি লেনদেন দেখানো হলো, মোট ${p.lines.length}টি]`
      ));
    }
    for (const r of displayLines) {
      const typeText = r.inAmt > 0 ? l('Deposit', 'জমা') : l('Withdrawal', 'উত্তোলন');
      const amtText = r.inAmt > 0 ? money(r.inAmt) : money(r.outAmt);
      txLines.push(`• ${r.date}: ${typeText} ${amtText} · ${l('Balance', 'ব্যালেন্স')}: ${money(r.balance)}`);
    }
    txLines.push('--------------------------------');
  }

  const footer = [
    l('Thank you.', 'ধন্যবাদ।'),
    `*${p.society}*`,
  ];

  return [...header, ...summary, ...txLines, ...footer].join('\n');
}

/** Open WhatsApp with the text for this phone; fall back to the share sheet. Opening is not proof of sending. */
export async function sendOnWhatsApp(phone: string | undefined, text: string) {
  const number = normalizeContactPhone(phone || '');
  const url = number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : '';
  try { if (url) { await Linking.openURL(url); return; } } catch { /* fall through to share */ }
  await Share.share({ message: text });
}
