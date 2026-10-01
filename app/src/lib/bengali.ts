export const BENGALI_MONTHS_SHORT = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

export const bengaliMonthNames = BENGALI_MONTHS_SHORT;

export const BENGALI_MONTHS_FULL = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

/**
 * Returns the short Bengali month name (0-indexed: 0 = জানু, 8 = সেপ্টে)
 */
export function getBengaliMonthShort(monthIndex: number): string {
  return BENGALI_MONTHS_SHORT[monthIndex] || '';
}

/**
 * Returns full Bengali month name
 */
export function getBengaliMonthFull(monthIndex: number): string {
  return BENGALI_MONTHS_FULL[monthIndex] || '';
}

export { toBengaliDigits, toEnglishDigits } from './money';

