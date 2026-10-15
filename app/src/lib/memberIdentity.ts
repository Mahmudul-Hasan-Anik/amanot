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
