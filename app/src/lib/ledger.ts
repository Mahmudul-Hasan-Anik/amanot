import type { Transaction } from '../store/somitiStore';
export type LedgerFilter = { from?:string; to?:string; memberId?:string; projectId?:string; paidMonth?:string };
export type LedgerCursor = { createdAt:string; id:string };
export type LedgerPage = { rows:Transaction[]; hasMore:boolean; cursor:LedgerCursor|null };
export type LedgerSummary = {
  months:Array<{month:string;deposits:number;profit:number;expenses:number;transaction_count:number}>;
  categories:Array<{month:string;category:string;amount:number}>;
  collections:Record<string,number>;
};
export const emptyLedgerSummary:LedgerSummary={months:[],categories:[],collections:{}};
export function monthRange(month:string) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Invalid month');
  const [year,m]=month.split('-').map(Number);
  return {from:`${month}-01`,to:`${m===12?year+1:year}-${String(m===12?1:m+1).padStart(2,'0')}-01`};
}
