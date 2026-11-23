import type { Transaction } from '../store/somitiStore';
export type LedgerFilter = { from?:string; to?:string; memberId?:string; projectId?:string; paidMonth?:string };
export type LedgerCursor = { createdAt:string; id:string };
export type LedgerPage = { rows:Transaction[]; hasMore:boolean; cursor:LedgerCursor|null };
export type LedgerSummary = {
  months:Array<{month:string;deposits:number;profit:number;expenses:number;withdrawals?:number;other_income?:number;funds?:number;transaction_count:number}>;
  categories:Array<{month:string;category:string;amount:number}>;
  collections:Record<string,number>;
};
export const emptyLedgerSummary:LedgerSummary={months:[],categories:[],collections:{}};
/** Money in (+) or out (−). Cancelled entries and their reversing rows count as zero. */
export function signedTransactionAmount(t:Pick<Transaction,'type'|'amount'|'investmentReversal'|'investmentDisbursement'>&{voided?:boolean}) {
 if(t.voided||t.type==='reversal')return 0;
 return t.type==='expense'||t.type==='withdrawal'||t.investmentReversal||t.investmentDisbursement?-t.amount:t.amount;
}

/** Keep monthly money-out auditable: refunds are not savings withdrawals. */
export function outgoingBreakdown(rows: Array<Pick<Transaction,'type'|'amount'|'investmentReversal'|'investmentDisbursement'>&{voided?:boolean}>) {
 const totals={withdrawals:0,expenses:0,investments:0,installmentRefunds:0,other:0};
 for(const t of rows){
  const amount=Math.max(0,-signedTransactionAmount(t));if(!amount)continue;
  if(t.type==='withdrawal')totals.withdrawals+=amount;
  else if(t.type==='expense')totals.expenses+=amount;
  else if(t.investmentDisbursement)totals.investments+=amount;
  else if(t.investmentReversal)totals.installmentRefunds+=amount;
  else totals.other+=amount;
 }
 return totals;
}
export function monthRange(month:string) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Invalid month');
  const [year,m]=month.split('-').map(Number);
  return {from:`${month}-01`,to:`${m===12?year+1:year}-${String(m===12?1:m+1).padStart(2,'0')}-01`};
}
