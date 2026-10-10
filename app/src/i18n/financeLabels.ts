// Translate app-defined labels only. Member names and custom notes stay intact.
const pairs = [
  ['Bank Account','ব্যাংক হিসাব'], ['Cash','নগদ'], ['Nagad','নগদ মোবাইল হিসাব'],
  ['bKash','বিকাশ'], ['Cash with Treasurer','কোষাধ্যক্ষের হাতে'], ['Cash with Field Worker','মাঠকর্মীর হাতে'],
  ['Meeting & Refreshment','সভা ও আপ্যায়ন'], ['Travel','যাতায়াত'], ['Office Rent','অফিস ভাড়া'],
  ['SMS & App','এসএমএস ও অ্যাপ'], ['Stationery','স্টেশনারি'], ['Legal Fees','আইনি ফি'],
  ['Field Staff Honorarium','মাঠকর্মী সম্মানী'], ['Others','অন্যান্য'],
  ['Society Expense','সমিতি খরচ'], ['Monthly Deposit','মাসিক জমা'], ['Internal Cash Transfer','অভ্যন্তরীণ তহবিল স্থানান্তর'],
  ['Project Investment','প্রজেক্ট বিনিয়োগ'], ['Project Return','প্রজেক্ট ফেরত'], ['Annual Profit','বার্ষিক লাভ'],
] as const;
export function financeLabel(value: string, bengali: boolean): string {
  const pair = pairs.find(p => p[0] === value || p[1] === value);
  return pair ? pair[bengali ? 1 : 0] : value;
}
export function financeNote(value: string, bengali: boolean): string {
  // Generated notes often use a fixed category prefix followed by user text.
  return value.split(/(:\s*)/).map((part, i) => i === 0 ? financeLabel(part, bengali) : part).join('');
}
export function financeDate(iso: string | undefined, fallback: string, bengali: boolean): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return fallback;
  const date = new Date(iso.slice(0,10)+'T12:00:00');
  return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat(bengali?'bn-BD':'en-GB',{day:'numeric',month:'short',year:'numeric'}).format(date);
}
