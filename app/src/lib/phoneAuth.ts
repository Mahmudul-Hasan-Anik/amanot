const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toEn = (s: string) => s.replace(/[০-৯]/g, d => String(BN_DIGITS.indexOf(d)));

/** Accept local, +880 and 00880 formats without truncating arbitrary numbers. */
export function normalizePhone(raw: string): string {
  const d = toEn(raw || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('1')) return '0' + d;
  if (d.length === 13 && d.startsWith('8801')) return d.slice(2);
  if (d.length === 15 && d.startsWith('008801')) return d.slice(4);
  return d;
}
export const isValidPhone = (raw: string): boolean => /^01[3-9]\d{8}$/.test(normalizePhone(raw));
export const PHONE_EMAIL_DOMAIN = 'member.amanot.app';
export function phoneToEmail(raw: string): string {
  const phone = normalizePhone(raw);
  if (!isValidPhone(phone)) throw new Error('মোবাইল নম্বর দিয়ে আবার লগইন শুরু করুন।');
  return `${phone}@${PHONE_EMAIL_DOMAIN}`;
}
export const pinToPassword = (pin: string) => `amanot:${toEn(pin || '').replace(/\D/g, '')}`;
