import { useMemo } from 'react';
import { useSomitiStore } from '../store/somitiStore';
import { useLanguage } from '../i18n/useLanguage';
import { accountLabel } from '../lib/displayText';

/** Cash accounts with their names in the reader's language (for pickers, chips and messages). */
export function useCashAccounts() {
  const accounts = useSomitiStore(s => s.cashAccounts);
  const { isBengali } = useLanguage();
  return useMemo(() => accounts.map(a => ({ ...a, name: accountLabel(a, isBengali) })), [accounts, isBengali]);
}
