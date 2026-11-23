import { toEnglishDigits } from './bengali';
export type MemberCategory = 'general' | 'shareholder' | 'director';
export const MEMBER_CATEGORIES = [
  {value:'general' as const,prefix:'M',en:'General Member',bn:'সাধারণ সদস্য'},
  {value:'shareholder' as const,prefix:'S',en:'Share Holder',bn:'শেয়ার হোল্ডার'},
  {value:'director' as const,prefix:'D',en:'Director',bn:'পরিচালক'},
];
export function normalizeMemberNumber(value:string) { return toEnglishDigits(value).trim(); }
export function legacyMemberNumber(code:string) { return /^(?:SM|M|S|D)-([0-9]+)$/.exec(code)?.[1]; }
export function memberCode(category:MemberCategory | '',number:string) {
  const type=MEMBER_CATEGORIES.find(item=>item.value===category);
  const clean=normalizeMemberNumber(number);
  if(!type || !/^[0-9]+$/.test(clean)) throw new Error('সদস্যের category ও শুধু সংখ্যায় member number দিন। / Select a category and enter a digits-only member number.');
  return `${type.prefix}-${clean}`;
}

export function compareMemberCodes(codeA: string, codeB: string): number {
  const numA = toEnglishDigits(codeA || '').replace(/\D/g, '');
  const numB = toEnglishDigits(codeB || '').replace(/\D/g, '');
  if (numA && numB && numA !== numB) {
    try {
      const bA = BigInt(numA);
      const bB = BigInt(numB);
      if (bA !== bB) return bA < bB ? -1 : 1;
    } catch {
      const cmp = numA.localeCompare(numB, 'en', { numeric: true });
      if (cmp !== 0) return cmp;
    }
  }
  return (codeA || '').localeCompare(codeB || '', 'en', { numeric: true });
}

export function compareMembersById(
  a: { code?: string; memberNumber?: string },
  b: { code?: string; memberNumber?: string }
): number {
  const rawA = a.memberNumber || a.code || '';
  const rawB = b.memberNumber || b.code || '';
  const numA = toEnglishDigits(rawA).replace(/\D/g, '');
  const numB = toEnglishDigits(rawB).replace(/\D/g, '');
  if (numA && numB && numA !== numB) {
    try {
      const bA = BigInt(numA);
      const bB = BigInt(numB);
      if (bA !== bB) return bA < bB ? -1 : 1;
    } catch {
      const cmp = numA.localeCompare(numB, 'en', { numeric: true });
      if (cmp !== 0) return cmp;
    }
  }
  return (a.code || '').localeCompare(b.code || '', 'en', { numeric: true });
}
