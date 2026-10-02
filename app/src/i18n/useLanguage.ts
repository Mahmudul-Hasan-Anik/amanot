import { useLanguageStore } from './languageStore';
import { toBengaliDigits } from '../lib/bengali';

export function useLanguage() {
  const store = useLanguageStore();

  const isBengali = store.language === 'bn';
  const isEnglish = store.language === 'en';

  const l = (enText: string, bnText: string): string => {
    return isBengali ? bnText : enText;
  };

  const formatMoney = (amount: number, options?: { showPlusSign?: boolean }): string => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    const formatted = Math.abs(safeAmount).toLocaleString('en-US');
    const prefix = options?.showPlusSign && safeAmount > 0 ? '+' : safeAmount < 0 ? '−' : '';
    const digitString = (store.useBengaliDigits || isBengali) ? toBengaliDigits(formatted) : formatted;
    return `${prefix}৳${digitString}`;
  };

  const formatNum = (num: number | string): string => {
    if (store.useBengaliDigits || isBengali) {
      return toBengaliDigits(num);
    }
    return String(num);
  };

  return {
    language: store.language,
    isBengali,
    isEnglish,
    useBengaliDigits: store.useBengaliDigits,
    l,
    formatMoney,
    formatNum,
    setLanguage: store.setLanguage,
    toggleLanguage: store.toggleLanguage,
    setUseBengaliDigits: store.setUseBengaliDigits,

    // Settings fields matching Page 22 of PDF
    dueDateDay: store.dueDateDay,
    setDueDateDay: store.setDueDateDay,
    gracePeriodDays: store.gracePeriodDays,
    setGracePeriodDays: store.setGracePeriodDays,
    defaultMonthlyDeposit: store.defaultMonthlyDeposit,
    setDefaultMonthlyDeposit: store.setDefaultMonthlyDeposit,
    lateFeeAmount: store.lateFeeAmount,
    setLateFeeAmount: store.setLateFeeAmount,
    expenseApprovalLimit: store.expenseApprovalLimit,
    setExpenseApprovalLimit: store.setExpenseApprovalLimit,
    accountingYear: store.accountingYear,
    setAccountingYear: store.setAccountingYear,
    autoReminder: store.autoReminder,
    setAutoReminder: store.setAutoReminder,
  };
}
