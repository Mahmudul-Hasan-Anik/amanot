import type { Transaction } from '../store/somitiStore';
import { financeLabel } from '../i18n/financeLabels';

type L = (en: string, bn: string) => string;
export type EntryKind = 'deposit' | 'withdrawal' | 'installment' | 'expense' | 'fund' | 'investment' | 'transfer' | 'cancel';

const METHOD: Record<string, [string, string]> = { cash: ['Cash', 'নগদ'], bank: ['Bank', 'ব্যাংক'], bkash: ['bKash', 'বিকাশ'], nagad: ['Nagad', 'নগদ (মোবাইল)'] };
export const methodName = (method: string, l: L) => (METHOD[method] ? l(...METHOD[method]) : method);

/**
 * How a ledger row reads in lists: the name in big type (who paid / what it was
 * for), then kind · reason · method underneath. Client feedback: the income and
 * expense list must always show who deposited and what the money was spent on.
 */
export function entryDisplay(t: Transaction, l: L, bengali: boolean): { title: string; detail: string; kind: EntryKind } {
  const note = (t.note || '').trim();
  const generic = ['জমা', 'Deposit', 'সঞ্চয় ফেরত', 'Savings withdrawal', 'বিনিয়োগ প্রদান'];
  const extra = (s: string) => (s && !generic.includes(s) ? s : '');
  const join = (...parts: string[]) => parts.filter(Boolean).join(' · ');
  if (t.type === 'reversal') return { title: t.memberName, detail: join(l('Cancelled entry', 'বাতিল এন্ট্রি'), note.replace(/^বাতিল:\s*/, '')), kind: 'cancel' };
  if (t.type === 'deposit') return { title: t.memberName, detail: join(l('Deposit', 'জমা'), extra(note), methodName(t.paymentMethod, l)), kind: 'deposit' };
  if (t.type === 'withdrawal') return { title: t.memberName, detail: join(l('Savings returned', 'সঞ্চয় ফেরত'), extra(note.replace(/^Savings withdrawal:?\s*/, '')), methodName(t.paymentMethod, l)), kind: 'withdrawal' };
  if (t.type === 'withdrawal_reversal') return { title: t.memberName, detail: join(l('Return cancelled', 'ফেরত বাতিল'), methodName(t.paymentMethod, l)), kind: 'cancel' };
  if (t.type === 'expense') {
    // Notes look like "Category: what for · spender".
    const [head, ...rest] = note.split(/:\s*/);
    const body = rest.join(': ');
    const [what, spender] = body.split(' · ');
    const title = t.memberName && !['সমিতি খরচ', 'Society Expense'].includes(t.memberName) ? t.memberName : (what || head || l('Expense', 'খরচ'));
    return { title, detail: join(l('Expense', 'খরচ'), financeLabel(head || '', bengali), spender ? l(`spent by ${spender}`, `খরচ করেছেন ${spender}`) : '', methodName(t.paymentMethod, l)), kind: 'expense' };
  }
  if (t.type === 'fund') return { title: t.memberName, detail: join(l('Money added', 'টাকা যোগ'), note !== t.memberName ? note : '', methodName(t.paymentMethod, l)), kind: 'fund' };
  if (t.type === 'profit' && t.projectId) return { title: t.memberName, detail: join(t.investmentReversal ? l('Installment cancelled', 'কিস্তি বাতিল') : l('Installment', 'কিস্তি'), t.memberCode, methodName(t.paymentMethod, l)), kind: 'installment' };
  if (t.investmentDisbursement) return { title: t.memberName, detail: join(l('Investment given', 'বিনিয়োগ দেওয়া'), methodName(t.paymentMethod, l)), kind: 'investment' };
  if (t.investmentReversal) return { title: t.memberName, detail: join(l('Installment cancelled', 'কিস্তি বাতিল'), note), kind: 'cancel' };
  if (t.type === 'transfer') return { title: note || l('Transfer between accounts', 'হিসাব বদল'), detail: join(l('Transfer', 'স্থানান্তর'), methodName(t.paymentMethod, l)), kind: 'transfer' };
  return { title: t.memberName || note, detail: join(financeLabel(note, bengali), methodName(t.paymentMethod, l)), kind: 'transfer' };
}
