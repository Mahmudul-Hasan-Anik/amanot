import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LanguageState {
  language: 'en' | 'bn';
  useBengaliDigits: boolean;
  dueDateDay: number;
  gracePeriodDays: number;
  defaultMonthlyDeposit: number;
  lateFeeAmount: number;
  expenseApprovalLimit: number;
  accountingYear: string;
  autoReminder: boolean;

  setLanguage: (lang: 'en' | 'bn') => void;
  toggleLanguage: () => void;
  setUseBengaliDigits: (val: boolean) => void;
  setDueDateDay: (day: number) => void;
  setGracePeriodDays: (days: number) => void;
  setDefaultMonthlyDeposit: (amount: number) => void;
  setLateFeeAmount: (amount: number) => void;
  setExpenseApprovalLimit: (limit: number) => void;
  setAccountingYear: (year: string) => void;
  setAutoReminder: (val: boolean) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'bn',
      useBengaliDigits: true,
      dueDateDay: 10,
      gracePeriodDays: 5,
      defaultMonthlyDeposit: 2000,
      lateFeeAmount: 100,
      expenseApprovalLimit: 10000,
      accountingYear: 'Jan – Dec',
      autoReminder: true,

      setLanguage: (lang) =>
        set({
          language: lang,
          useBengaliDigits: lang === 'bn',
        }),

      toggleLanguage: () =>
        set((state) => {
          const next = state.language === 'en' ? 'bn' : 'en';
          return {
            language: next,
            useBengaliDigits: next === 'bn',
          };
        }),

      setUseBengaliDigits: (val) => set({ useBengaliDigits: val }),
      setDueDateDay: (day) => set({ dueDateDay: day }),
      setGracePeriodDays: (days) => set({ gracePeriodDays: days }),
      setDefaultMonthlyDeposit: (amount) => set({ defaultMonthlyDeposit: amount }),
      setLateFeeAmount: (amount) => set({ lateFeeAmount: amount }),
      setExpenseApprovalLimit: (limit) => set({ expenseApprovalLimit: limit }),
      setAccountingYear: (year) => set({ accountingYear: year }),
      setAutoReminder: (val) => set({ autoReminder: val }),
    }),
    {
      name: 'amanot-app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
