const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const englishDigits: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

/**
 * Converts English digits (0-9) to Bengali digits (০-৯)
 */
export function toBengaliDigits(input: number | string): string {
  if (input === null || input === undefined) return '';
  return input.toString().replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

/**
 * Converts Bengali digits (০-৯) to English digits (0-9)
 */
export function toEnglishDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[০-৯]/g, (char) => englishDigits[char] || char);
}

/**
 * Formats a number with South Asian grouping (e.g. 48,50,000)
 */
export function formatSouthAsianNumber(amount: number): string {
  const isNegative = amount < 0;
  const absStr = Math.abs(Math.round(amount)).toString();

  if (absStr.length <= 3) {
    return (isNegative ? '-' : '') + absStr;
  }

  const lastThree = absStr.substring(absStr.length - 3);
  const otherNumbers = absStr.substring(0, absStr.length - 3);
  const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return (isNegative ? '-' : '') + formattedOthers + ',' + lastThree;
}

/**
 * Formats number to Bengali Taka (e.g. ৳৪৮,৫০,০০০ or +৳৩,১২,০০০ or -৳৪০,০০০)
 */
export function formatBengaliMoney(amount: number, options: { showPlusSign?: boolean } = {}): string {
  const isNegative = amount < 0;
  const isPositive = amount > 0;
  const formattedNumber = formatSouthAsianNumber(Math.abs(amount));
  const bengaliNumber = toBengaliDigits(formattedNumber);

  if (isNegative) {
    return `-৳${bengaliNumber}`;
  }
  if (isPositive && options.showPlusSign) {
    return `+৳${bengaliNumber}`;
  }
  return `৳${bengaliNumber}`;
}

/**
 * Formats large amounts in Lakhs format (e.g. 4850000 -> ৳৪৮.৫ল)
 */
export function formatBengaliLakh(amount: number): string {
  const inLakhs = (amount / 100000).toFixed(1);
  const trimmed = inLakhs.endsWith('.0') ? inLakhs.slice(0, -2) : inLakhs;
  return `৳${toBengaliDigits(trimmed)}ল`;
}
