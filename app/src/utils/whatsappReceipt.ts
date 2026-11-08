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

/** Open WhatsApp with the text for this phone; fall back to the share sheet. Opening is not proof of sending. */
export async function sendOnWhatsApp(phone: string | undefined, text: string) {
  const number = normalizeContactPhone(phone || '');
  const url = number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : '';
  try { if (url) { await Linking.openURL(url); return; } } catch { /* fall through to share */ }
  await Share.share({ message: text });
}
